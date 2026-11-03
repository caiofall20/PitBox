import { fileUrl } from '../services/api.js';
const NO = '/assets/sem-foto.svg';
export default function Photo({ src, ratio = '16/10', radius = 0, alt = '' }) {
  const u = fileUrl(src) || NO;
  return (
    <div className="photo" role={alt ? 'img' : undefined} aria-label={alt || undefined} style={{ aspectRatio: ratio, borderRadius: radius }}>
      <div className="blur" style={{ backgroundImage: `url("${u}")` }} />
      <div className="img" style={{ backgroundImage: `url("${u}")` }} />
    </div>
  );
}
