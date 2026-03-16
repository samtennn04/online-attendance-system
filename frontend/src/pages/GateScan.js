navigator.geolocation.getCurrentPosition(async (position) => {

const latitude = position.coords.latitude;
const longitude = position.coords.longitude;

const token = localStorage.getItem("token");

const res = await axios.post(`${API_URL}/attendance`,{
qrData: decodedText,
latitude: latitude,
longitude: longitude
},{
headers:{
Authorization: "Bearer " + token
}
});

alert(res.data.message);

});