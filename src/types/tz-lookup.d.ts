declare module 'tz-lookup' {
  /** IANA time zone name for a coordinate; throws for coordinates out of range. */
  export default function tzlookup(latitude: number, longitude: number): string;
}
