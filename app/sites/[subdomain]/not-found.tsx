import Link from "next/link";

export default function SiteNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🇵🇭</div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Site not found
      </h1>
      <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "2rem" }}>
        This website hasn't been published yet, or the subdomain doesn't exist.
      </p>
      <a
        href="https://storebuilder.ph"
        style={{
          padding: "0.75rem 1.5rem",
          background: "#7c3aed",
          borderRadius: "0.75rem",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        Build your own website
      </a>
    </div>
  );
}
