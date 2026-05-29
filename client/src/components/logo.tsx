import * as React from "react"
import Image from "next/image"

interface LogoProps extends Omit<React.ComponentProps<typeof Image>, "src" | "width" | "height" | "alt"> {
  size?: number
  alt?: string
}

export function Logo({ size = 24, alt = "PathFinder", className, style, ...props }: LogoProps) {
  return (
    <Image
      src="/pathfinder-logo-mark.png"
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        ...style,
      }}
      {...props}
    />
  )
}
