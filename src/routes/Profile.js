import React from "react";
import Background from "../components/Profile.jsx";
import NavBar from "../components/NavBar.js";

const Profile = () => {
  return (
    <div>
      <NavBar isProfile={true} />
      <Background />
    </div>
  );
};

export default Profile;
