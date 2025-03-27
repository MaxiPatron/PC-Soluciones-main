import React from 'react';
import './SkillsStyle.css';
import { FaJs, FaHtml5, FaCss3, FaReact, FaBootstrap, FaNpm, FaPhp, FaGithub } from "react-icons/fa";
import { SiPostgresql, SiVisualstudio, SiVisualstudiocode } from "react-icons/si";
import { FaC } from "react-icons/fa6";
import { TbBrandMysql } from "react-icons/tb";

const Skills = () => {
    return (
        <div className="home-Skill-section" id="Skill">
            <h1 className="skill-title">Tecnologías</h1>
            <div className="skills-container">
                <div className="skills-box">
                    <h2 className="skills-box-title">Frontend</h2>
                    <ul className="skills-text">
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://developer.mozilla.org/en-US/docs/Web/HTML" target="_blank" rel="noopener noreferrer"><FaHtml5 /></a>
                        </li>
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://developer.mozilla.org/en-US/docs/Web/CSS" target="_blank" rel="noopener noreferrer"><FaCss3 /></a>
                        </li>
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank" rel="noopener noreferrer"><FaJs /></a>
                        </li>
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://react.dev/" target="_blank" rel="noopener noreferrer"><FaReact /></a>
                        </li>
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://getbootstrap.com/" target="_blank" rel="noopener noreferrer"><FaBootstrap /></a>
                        </li>
                    </ul>
                </div>
                <div className="skills-box">
                    <h2 className="skills-box-title">Backend</h2>
                    <ul>
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://www.npmjs.com/" target="_blank" rel="noopener noreferrer"><FaNpm /></a>
                        </li>
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://www.php.net/" target="_blank" rel="noopener noreferrer"><FaPhp /></a>
                        </li>
                        <li>
                            <span className='icons' style={{ color: "#000", marginBottom: "12px" }}>
                                <FaC />
                                <span className='hash'>#</span>
                            </span>
                        </li>
                        <li>
                            <span className='icons' style={{ color: "#000", fontSize: "1.5rem", marginBottom: "12px" }}>ASP.NET</span>
                        </li>
                    </ul>
                </div>
                <div className="skills-box">
                    <h2 className="skills-box-title">Otros</h2>
                    <ul>
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://www.mysql.com/" target="_blank" rel="noopener noreferrer"><TbBrandMysql /></a>
                        </li>
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://www.postgresql.org/" target="_blank" rel="noopener noreferrer"><SiPostgresql /></a>
                        </li>
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://github.com/" target="_blank" rel="noopener noreferrer"><FaGithub /></a>
                        </li>
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://visualstudio.microsoft.com/" target="_blank" rel="noopener noreferrer"><SiVisualstudio /></a>
                        </li>
                        <li>
                            <a className='icons' style={{ color: "#000" }} href="https://code.visualstudio.com/" target="_blank" rel="noopener noreferrer"><SiVisualstudiocode /></a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Skills;
