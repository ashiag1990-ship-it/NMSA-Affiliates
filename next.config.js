/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Explicitly allow this app to be embedded in an <iframe> on the
          // NMSA marketing site (and its Bolt preview domain while testing).
          // Without this, some hosts/CDNs default to blocking framing
          // entirely, which shows up in the browser as "refused to connect."
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://nationalmsa.org https://*.nationalmsa.org https://bolt.new https://*.bolt.new;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
