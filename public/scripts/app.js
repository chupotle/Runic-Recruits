async function getUser() {
    try {
      const response = await axios.get('http://localhost:21337/positional-rectangles');
      console.log(response.data.PlayerName);
    } catch (error) {
      console.error(error);
    }
  } 

  getUser();