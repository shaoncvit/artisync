import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>ArtiSync — Discover talent. Create together.</title>
        <meta name="description" content="ArtiSync connects clients with talented artists for events, performances, and creative collaborations." />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
