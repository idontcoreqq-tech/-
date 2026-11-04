/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@neondatabase/serverless",
    "files-sdk",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-presigned-post",
    "@aws-sdk/s3-request-presigner",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
