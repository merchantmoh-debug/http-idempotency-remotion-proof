import React from 'react';
import type {Caption} from '@remotion/captions';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import captions from './captions.json';

export const CaptionBar: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const now = frame / fps * 1000;
  const caption = (captions as Caption[]).find(c => now >= c.startMs && now < c.endMs);
  return <div style={{position: 'absolute', left: 80, right: 80, top: 912, height: 80, display: 'flex', alignItems: 'center', borderTop: '1px solid #33465c'}}>
    <div data-qa="caption" style={{fontSize: 34, color: '#eef2f4', lineHeight: 1.35}}>{caption?.text}</div>
  </div>;
};
