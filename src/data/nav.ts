export interface NavItem {
  label: string;
  href: string;
}

// later sections of the site append their item here
export const nav: NavItem[] = [
  { label: 'about', href: '/' },
  { label: 'publications', href: '/publications/' },
  { label: 'projects', href: '/projects/' },
  { label: 'essays', href: '/essays/' },
  { label: 'photography', href: '/photography/' },
  { label: 'art', href: '/art/' },
  { label: 'music', href: '/music/' },
];
