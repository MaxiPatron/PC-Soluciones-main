import "./BackImgStyle.css";
import IntroImg from "../assets/Prog.jpg";
import { Link } from "react-router-dom";
const BackImg = () => {
    return (<div className="imghome">
        <div className="mask">
            <img id="Home" className="into-Img" src={IntroImg} alt="IntroImg" />
        </div>
        <div className="content">
            <p style={{ color: "#fff" }}>Hola, soy Máximo</p>
            <h1 style={{ color: "#000" }}>Desarrollador de Software</h1>
            <div>
                <Link to="/" className="btn">
                    Proyectos
                </Link>
                <Link id="About" className="btn btn-light">
                    <a href="#footer">Contacto</a>
                </Link>
            </div>
        </div>
    </div>)
};
export default BackImg;