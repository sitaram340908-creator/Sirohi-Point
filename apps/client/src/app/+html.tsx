import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en-IN">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#131A22" />
        <meta name="color-scheme" content="light dark" />
        <meta name="description" content="Shop hardware, electrical, electronics, paint, PVC pipe and sanitary products with cart, saved items, checkout and customer order tracking." />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Sirohi Point | Shop Products for Home and Business" />
        <meta property="og:description" content="Shop useful products, compare prices and stock, save favourites, check out and track orders in one customer marketplace." />
        <meta property="og:image" content="https://sirohi-point-marketplace.talent35791.chatgpt.site/og.png" />
        <meta property="og:image:alt" content="Sirohi Point customer shopping marketplace" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Sirohi Point | Shop Products for Home and Business" />
        <meta name="twitter:description" content="Shop useful products, compare prices and stock, save favourites, check out and track orders in one customer marketplace." />
        <meta name="twitter:image" content="https://sirohi-point-marketplace.talent35791.chatgpt.site/og.png" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
