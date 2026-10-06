'use client';

import React from 'react';
import '@/app/pattern-stars.css';

export default function StarFieldBackground() {
  return (
    <div className="refinery-stars-bg" aria-hidden="true">
      <div id="stars" />
      <div id="stars2" />
      <div id="stars3" />
    </div>
  );
}
