import { Link } from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="navbar navbar-dark bg-dark navbar-expand-lg">
            <div className="container">
                <Link className="navbar-brand" to="/">
                    <i className="bi bi-graph-up-arrow me-2"></i>
                    Voyage
                </Link>
            </div>
        </nav>
    );
}
