/**
 * Real Google reviews, copied from the review widget on the old site (September 2026).
 * Text is verbatim apart from obvious spacing. Two reviews were left out because the
 * reviewers appear connected to the business or its web developer.
 * TODO: refresh from the Google Business Profile before launch.
 */
export interface Review {
  name: string;
  date: string;
  rating: number;
  text: string;
  /** Specific install mentioned by the reviewer, if any. */
  install?: string;
}

export const REVIEWS: Review[] = [
  {
    name: 'Trading Singh',
    date: '2024-08-12',
    rating: 5,
    install: '5 kW on-grid',
    text: 'It was amazing dealing with RSK Solar Energy. They helped me with genuine estimates and installed a 5KW on-grid connection for me in just 2 days. Super fast service at an affordable price.',
  },
  {
    name: 'HELLO CARS',
    date: '2024-08-27',
    rating: 5,
    install: '5 kW off-grid, Mohali',
    text: 'After thoroughly researching solar solutions in the Tricity area, I decided on a 5KW off-grid connection in Mohali, and I’m extremely satisfied with my choice. They offer highly competitive prices without compromising on quality. I highly recommend them to anyone considering a solar solution.',
  },
  {
    name: 'Monty',
    date: '2024-08-12',
    rating: 5,
    install: '3 kW off-grid, Mohali',
    text: 'Best Prices in the entire Tricity. I did a lot of research before getting myself a 3KW off grid connection in Mohali. I found there prices best and the product of top quality. I highly recommend everyone to get solar solutions from them.',
  },
  {
    name: 'Sunil Kumar',
    date: '2023-03-06',
    rating: 5,
    text: 'I got solar panels bought and installed from RSK Solar Energy. The service was amazing and I got the best price as compared to the market.',
  },
  {
    name: 'Rahul Sharma',
    date: '2024-08-23',
    rating: 5,
    text: 'Rsk solar energy provide high - quality solar panels with excellent service, making the entire experience satisfying.',
  },
  {
    name: 'Ravneek Kaur',
    date: '2024-01-12',
    rating: 5,
    text: 'I got the best deal in terms of price and quality. I would highly recommend their services.',
  },
];

export function reviewMonth(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
