fetch('profile.json')
  .then(response => response.json())
  .then(data => {
    document.getElementById('bio').textContent = data.bio;
    document.getElementById('address').textContent = data.address;
    document.getElementById('additionalInfo').textContent = data.additionalInfo;
    document.getElementById('twitterLink').href = data.socialLinks.twitter;
    document.getElementById('linkedinLink').href = data.socialLinks.linkedin;
    document.getElementById('githubLink').href = data.socialLinks.github;
  });
