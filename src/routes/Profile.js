import React from "react";
import ProfileContent from "../components/Profile.jsx";
import NavBar from "../components/NavBar.js";
import Footer from "../components/Footer.js";

const Profile = () => {
  return (
    <div>
      <NavBar />
      <ProfileContent />
      <Footer />
    </div>
  );
};

export default Profile;
