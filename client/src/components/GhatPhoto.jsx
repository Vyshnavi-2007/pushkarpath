import React, { useState } from 'react';
import GhatIllustration from './GhatIllustration';

const GHAT_PHOTOS = {
  PKG: '/photos/pushkar-ghat.png',
  KTL: '/photos/kotilingala-ghat.png',
  SRW: '/photos/saraswathi-ghat.png',
  MRK: '/photos/markandeya-ghat.png',
  GWG: '/photos/gowthami-ghat.png',
  TVR: '/photos/ramapadalarevu-ghat.png',
  PDM: 'https://d2kihw5e8drjh5.cloudfront.net/eyJidWNrZXQiOiJ1dGEtaW1hZ2VzIiwia2V5IjoicGxhY2VfaW1nLzRjNzY1ODY0MjM4YTRjNzY5ZTEyYzVhZWNhMGIxZWMxIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo2NDAsImhlaWdodCI6NjQwLCJmaXQiOiJpbnNpZGUifSwicm90YXRlIjpudWxsLCJ0b0Zvcm1hdCI6ICJ3ZWJwIn19',
  TTD: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi8vcYW9dAy2yWemrrUEOVuEDn9-juD00ijcReRvQXsIdLmblapFwBu3cuqvH-F6irKmtthlDyf7cWKtFgkNSR493wiFaxLKqFwHbjRFMC1SvW-OCCxT1h-NUCsMnogZYuL197yqoEJQ0NS/s1600/TTD-Ghat.jpg',
  SRD: 'https://scontent.fvtz3-1.fna.fbcdn.net/v/t39.30808-6/484469826_2395616524124888_3483792433386016547_n.jpg?stp=dst-jpg_tt6&cstp=mx720x900&ctp=p600x600&_nc_cat=109&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=6376bf&_nc_ohc=_thnoJLAgGUQ7kNvwFeABmj&_nc_oc=AdrnDWxlPFVAI8ErTaVvq9-R5l8AyO3EjTUPfLuNWaJOGkBpVLJSaySK7GsJTQurSr4&_nc_zt=23&_nc_ht=scontent.fvtz3-1.fna&_nc_gid=YkEKPoiJQ8Uf2-QJIQFJJw&_nc_ss=7b20f&oh=00_AQRapPMp0znoFMgsAziMdfHYvYu5hXFo-mBysazOg5g_wg&oe=6AF4E368',
  SNK: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUt6eBoJIK_izFpAjVlRUiAm9E9x1KjtK3BEhYNraY2K6btV3CJmVuXbo&s=10',
  SNN: '/images/ghats/SNN.jpg',
};

function getPhotoUrl(ghat) {
  const defaultPhoto = `/images/ghats/${ghat.code}.jpg`;
  if (!ghat.photo || ghat.photo === defaultPhoto) {
    return GHAT_PHOTOS[ghat.code] || defaultPhoto;
  }
  if (ghat.photo.startsWith('http') || ghat.photo.startsWith('/')) {
    return ghat.photo;
  }
  return `/photos/${ghat.photo}`;
}

export default function GhatPhoto({ ghat, className = 'w-full h-full object-cover' }) {
  const photoUrl = getPhotoUrl(ghat);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState(null);

  if (!photoUrl || failedPhotoUrl === photoUrl) {
    return <GhatIllustration title={ghat.name} className={className} />;
  }

  return (
    <img
      src={photoUrl}
      alt={`${ghat.name} photo`}
      className={className}
      onError={() => setFailedPhotoUrl(photoUrl)}
    />
  );
}
