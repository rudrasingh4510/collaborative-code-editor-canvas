import React from 'react';
import Avatar from 'react-avatar';
import config from '../config';

function Client({username, userProfile, isCurrentUser = false}) {
  console.log('🔹 Client component received:', { username, userProfile, isCurrentUser }); // Debug log

  const displayName = isCurrentUser ? 'You' : username.toString();
  
  // Function to get a valid Google profile picture URL using proxy
  const getValidProfilePictureUrl = (pictureUrl) => {
    if (!pictureUrl) return null;
    
    console.log('🔹 Original picture URL:', pictureUrl);
    
    // If it's a Google URL, use our proxy to avoid CORS issues
    if (pictureUrl.includes('googleusercontent.com')) {
      const proxyUrl = `${config.SERVER_URL}/api/profile-image?url=${encodeURIComponent(pictureUrl)}`;
      console.log('🔹 Using proxy URL:', proxyUrl);
      return proxyUrl;
    }
    
    console.log('🔹 Using non-Google URL:', pictureUrl);
    return pictureUrl;
  };

  return (
    <div className="d-flex align-items-center mb-3">
      {userProfile && userProfile.picture ? (
        <img 
          src={getValidProfilePictureUrl(userProfile.picture)} 
          alt={displayName}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            marginRight: '12px',
            objectFit: 'cover'
          }}
          onError={(e) => {
            console.log('❌ Profile picture failed to load for:', displayName);
            console.log('❌ Failed URL:', e.target.src);
            console.log('❌ Error details:', e);
            console.log('🔄 Falling back to generated avatar for:', displayName);
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
          onLoad={(e) => {
            console.log('✅ Profile picture loaded successfully for:', displayName);
            console.log('✅ Loaded URL:', e.target.src);
          }}
        />
      ) : null}
      <Avatar 
        name={displayName} 
        size={50} 
        round="14px" 
        className="mr-3" 
        style={{ display: userProfile && userProfile.picture ? 'none' : 'block' }}
      />
      <span className='mx-2' style={{ fontWeight: isCurrentUser ? 'bold' : 'normal' }}>
        {displayName}
      </span>
    </div>
  );
}

export default Client;
