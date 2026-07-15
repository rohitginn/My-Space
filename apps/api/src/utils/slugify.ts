import slugifyPackage from 'slugify';

export function slugify(value: string) {
  return slugifyPackage(value, { lower: true, strict: true, trim: true });
}
