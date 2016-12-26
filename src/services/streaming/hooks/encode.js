'use strict';

const exec = require('child_process').exec;
const ffmpeg = require('fluent-ffmpeg');
const errors = require('feathers-errors');

module.exports = () => hooks => {

  const service = hooks.app.service('streamings');
  const dir = process.env.DATA;
  let streaming;

  const getName = () => {
    return streaming.streamName;
  };
  const getOutput = ver => {
    return dir + '/' + getName() + '/' + ver;
  };
  const init = () => {
    return new Promise((resolve,reject) => {
      service.patch(hooks.id, {status: 'encoding'})
        .then(resolve)
        .catch(reject);
    });
  };
  const getStreaming = () => {
    return new Promise((resolve,reject) => {
      service.get(hooks.id).then(data => {
        streaming = data;
        resolve();
      }).catch(err => {
        reject(err);
      });
    });
  };
  const createDir = () => {
    return new Promise((resolve,reject) => {
      exec('mkdir -p ' + dir + '/' + getName(), (err, stdout, stderr) => {
        if(err !== null) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };
  const encode = () => {
    return new Promise((resolve,reject) => {
      ffmpeg()
        .input(dir + '/' + getName() + '.flv')
        // 720p
        .output(getOutput('720p.mp4'))
          .size('?x720')
          .videoCodec('libx264')
          .videoBitrate('1920k')
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .format('mp4')
        // 480p
        .output(getOutput('480p.mp4'))
          .size('?x480')
          .videoBitrate('1024k')
        // 360p
        .output(getOutput('360p.mp4'))
          .size('?x360')
          .videoBitrate('768k')
          .audioBitrate('96k')
        // 240p
        .output(getOutput('240p.mp4'))
          .size('?x240')
          .videoBitrate('256k')
          .audioBitrate('32k')
        // Audio only
        .output(getOutput('audio.mp3'))
          .noVideo()
          .audioBitrate('128k')
        .on('end', () => {
          resolve(hooks);
        })
        .on('error', err => {
          reject(err);
        })
        .run();
    });
  };
  const moveOriginal = () => {
    return new Promise((resolve,reject) => {
      exec('mv ' + dir + '/' + getName() + '.flv ' + dir + '/' + getName() + '/', (err, stdout, stderr) => {
        if(err !== null) {
          reject(err);
        } else {
          resolve();
        }
      });
    })
  };
  const res = err => {
    if(err) {
      console.log(err);
    } else {
      service.patch(hooks.id, {status: 'encoded'});
    }
    return hooks;
  };
  if(hooks.data.status == 'finished') {
    init()
      .then(getStreaming)
      .then(createDir)
      .then(encode)
      .then(moveOriginal)
      .then(res)
      .catch(res);
  }
  return hooks;
};