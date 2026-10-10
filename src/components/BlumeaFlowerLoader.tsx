"use client";

import Image from "next/image";

type BlumeaFlowerLoaderProps = {
  size?: number;
};

export default function BlumeaFlowerLoader({
  size = 32,
}: BlumeaFlowerLoaderProps) {
  const petals = [
    "/blumea-loader/petal-1-top.png",
    "/blumea-loader/petal-2-right.png",
    "/blumea-loader/petal-3-bottom-right.png",
    "/blumea-loader/petal-4-bottom-left.png",
    "/blumea-loader/petal-5-left.png",
  ];

  return (
    <div
      className="relative shrink-0"
      style={{
        width: size,
        height: size,
      }}
    >
      {petals.map((petal, index) => (
        <Image
          key={petal}
          src={petal}
          alt=""
          fill
          sizes={`${size}px`}
          className="blumea-loader-petal object-contain"
          style={{
            animationDelay: `${index * 180}ms`,
          }}
        />
      ))}
    </div>
  );
}