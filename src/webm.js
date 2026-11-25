import { formats } from './project';

export async function encodeWebm({ canvas, draw, frameCount, needsFrame, settings, report }) {
  const base = new URL(`${import.meta.env.BASE_URL}ffmpeg/vp9/`, document.baseURI);
  const { default: LibAV } = await import(/* @vite-ignore */ new URL('index.mjs', base).href);
  // The libvpx build in ffmpeg.wasm fails on inter frames. Use LibAV.js's newer FFmpeg build for VP9.
  const engine = await LibAV.LibAV({ yesthreads: false });
  const { width, height } = canvas;
  const { fps, crf } = settings;
  const timeBase = [1, fps];
  const rgba = engine.AV_PIX_FMT_RGBA;
  const yuv = engine.AV_PIX_FMT_YUV420P;
  const outputFile = 'present-fflow.webm';
  const context = canvas.getContext('2d');

  try {
    const [, encoder, frame, packet] = await engine.ff_init_encoder('libvpx-vp9', {
      time_base: timeBase,
      ctx: { width, height, pix_fmt: yuv, bit_rate: 0, framerate_num: fps, framerate_den: 1, gop_size: fps * 2 },
      options: { crf: String(crf), deadline: 'realtime', 'cpu-used': crf === 26 ? '8' : '6', 'lag-in-frames': '0' },
    });
    const [, source, sink] = await engine.ff_init_filter_graph('scale=out_color_matrix=bt709,format=yuv420p',
      { type: engine.AVMEDIA_TYPE_VIDEO, width, height, pix_fmt: rgba, time_base: timeBase },
      { type: engine.AVMEDIA_TYPE_VIDEO, width, height, pix_fmt: yuv, time_base: timeBase });
    const [muxer, , file] = await engine.ff_init_muxer({ filename: outputFile, format_name: 'webm', open: true }, [[encoder, ...timeBase]]);
    if (await engine.avformat_write_header(muxer, 0) < 0) throw new Error('A WebM fejléc írása sikertelen.');

    let sceneFrame;
    for (let index = 0; index < frameCount; index += 1) {
      if (needsFrame(index)) {
        if (sceneFrame) await engine.av_frame_free_js(sceneFrame);
        draw(index / fps);
        const { data } = context.getImageData(0, 0, width, height);
        [sceneFrame] = await engine.ff_filter_multi(source, sink, frame, [{
          data: new Uint8Array(data.buffer), libavjsTransfer: [data.buffer],
          layout: [{ offset: 0, stride: width * 4 }], format: rgba, width, height,
          pts: index, time_base_num: 1, time_base_den: fps,
        }], { copyoutFrame: 'ptr' });
        if (!sceneFrame) throw new Error('A VP9 képkocka előkészítése sikertelen.');
      }
      await engine.AVFrame_pts_s(sceneFrame, index);
      // LibAV.js consumes frame pointers passed to the encoder. Retain the scene frame for the still hold.
      const encodingFrame = await engine.av_frame_clone(sceneFrame);
      if (!encodingFrame) throw new Error('A VP9 képkocka másolása sikertelen.');
      const packets = await engine.ff_encode_multi(encoder, frame, packet, [encodingFrame], index === frameCount - 1);
      for (const encoded of packets) encoded.duration ||= 1;
      await engine.ff_write_multi(muxer, packet, packets);
      if (index % 3 === 0 || index === frameCount - 1) {
        report({ progress: 7 + ((index + 1) / frameCount) * 90, phase: 'WebM kódolása', prepared: index + 1, encoded: index + 1 });
      }
    }

    if (await engine.av_write_trailer(muxer) < 0) throw new Error('A WebM lezárása sikertelen.');
    await engine.ff_free_muxer(muxer, file);
    return new Blob([await engine.readFile(outputFile)], { type: formats.webm.mime });
  } finally {
    engine.terminate();
  }
}
