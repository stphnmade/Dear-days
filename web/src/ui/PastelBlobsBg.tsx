"use client";

import React from "react";

export default function PastelBlobsBg() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-0 overflow-hidden"
    >
      <div className="absolute inset-0 opacity-45 dd-card-muted" />

      {/* blobs */}
      <Blob
        w={520}
        h={520}
        style={{
          left: "-8%",
          top: "-6%",
          // colors
          ["--c1" as any]: "#FFE7EE",
          ["--c2" as any]: "#EDE9FE",
          // motion
          ["--dur" as any]: "22s",
          ["--delay" as any]: "-2s",
          ["--tx" as any]: "18px",
          ["--ty" as any]: "10px",
          ["--scale" as any]: "1.05",
          ["--op" as any]: "0.65",
        }}
      />
      <Blob
        w={460}
        h={460}
        style={{
          right: "-6%",
          top: "10%",
          ["--c1" as any]: "#DFF7FF",
          ["--c2" as any]: "#E7FFE9",
          ["--dur" as any]: "26s",
          ["--delay" as any]: "-5s",
          ["--tx" as any]: "-16px",
          ["--ty" as any]: "12px",
          ["--scale" as any]: "1.02",
          ["--op" as any]: "0.6",
        }}
      />
      <Blob
        w={600}
        h={600}
        style={{
          left: "40%",
          bottom: "-20%",
          ["--c1" as any]: "#FFF5D6",
          ["--c2" as any]: "#FFE7F1",
          ["--dur" as any]: "28s",
          ["--delay" as any]: "-8s",
          ["--tx" as any]: "12px",
          ["--ty" as any]: "-10px",
          ["--scale" as any]: "1.1",
          ["--op" as any]: "0.55",
        }}
      />
      <Blob
        w={380}
        h={380}
        style={{
          left: "22%",
          top: "46%",
          ["--c1" as any]: "#E6F0FF",
          ["--c2" as any]: "#F1E8FF",
          ["--dur" as any]: "24s",
          ["--delay" as any]: "-11s",
          ["--tx" as any]: "-10px",
          ["--ty" as any]: "8px",
          ["--scale" as any]: "1.06",
          ["--op" as any]: "0.5",
        }}
      />
      <Blob
        w={320}
        h={320}
        style={{
          right: "20%",
          bottom: "10%",
          ["--c1" as any]: "#FFE6E6",
          ["--c2" as any]: "#E6FFF7",
          ["--dur" as any]: "20s",
          ["--delay" as any]: "-3s",
          ["--tx" as any]: "8px",
          ["--ty" as any]: "6px",
          ["--scale" as any]: "1.03",
          ["--op" as any]: "0.45",
        }}
      />
    </div>
  );
}

function Blob({
  w,
  h,
  style,
}: {
  w: number;
  h: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="dd-blob"
      style={{
        width: w,
        height: h,
        ...style,
      }}
    />
  );
}
