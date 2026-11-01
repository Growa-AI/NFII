/** @type {import('next').NextConfig} */
const nextConfig = {
  // The ocean pathfinder reads its MIT-licensed bundled ocean-grid binary at runtime.
  serverExternalPackages: ['@arcnautical/maritime-routing'],
  // Type errors now fail the build (the project compiles clean): the old
  // `typescript.ignoreBuildErrors: true` let 33 of them ship unnoticed.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
