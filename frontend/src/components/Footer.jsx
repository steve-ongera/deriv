export default function Footer() {
    return (
        <footer className="bg-light border-top py-3 mt-5 text-center">
            <small className="text-muted">
                © {new Date().getFullYear()} Voyage
            </small>
        </footer>
    );
}
