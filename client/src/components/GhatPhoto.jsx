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
  SRD: '/photos/sradhananda-ghat.png',
  SNK: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUt6eBoJIK_izFpAjVlRUiAm9E9x1KjtK3BEhYNraY2K6btV3CJmVuXbo&s=10',
  SNN: '/photos/narasimhanagar-ghat.png',
};

function getPhotoUrl(ghat) {
  if (!ghat) return '/photos/pushkar-ghat.png';
  if (GHAT_PHOTOS[ghat.code]) {
    return GHAT_PHOTOS[ghat.code];
  }
  if (ghat.photo && (ghat.photo.startsWith('http') || ghat.photo.startsWith('/'))) {
    return ghat.photo;
  }
  return `/images/ghats/${ghat.code}.jpg`;
}

export default function GhatPhoto({ ghat, className = 'w-full h-full object-cover' }) {
  const photoUrl = getPhotoUrl(ghat);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState(null);

  if (!photoUrl || failedPhotoUrl === photoUrl) {
    return <GhatIllustration title={ghat?.name || 'Ghat'} className={className} />;
  }

  return (
    <img
      src={photoUrl}
      alt={`${ghat?.name || 'Ghat'} photo`}
      className={className}
      onError={() => {
        // Fallback to local ghat photo if external URL fails
        if (ghat?.code === 'SRD') {
          setFailedPhotoUrl(photoUrl);
        } else if (ghat?.code === 'SNN') {
          setFailedPhotoUrl(photoUrl);
        } else {
          setFailedPhotoUrl(photoUrl);
        }
      }}
    />
  );
}
