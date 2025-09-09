fetch('profile.json')
  .then(response => response.json())
  .then(data => {
    document.getElementById('profileImage').src = data.profileImage;
    document.getElementById('name').textContent = data.name;
    document.getElementById('title').textContent = data.title;
    document.getElementById('callButton').href = 'tel:' + data.phone;
    document.getElementById('emailButton').href = 'mailto:' + data.email;
    document.getElementById('whatsappButton').href = data.whatsapp;
  });
