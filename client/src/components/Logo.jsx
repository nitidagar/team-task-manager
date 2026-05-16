export default function Logo({ size = "md" }) {
  const isLg = size === "lg";
  return (
    <div className={`logo ${isLg ? "logo-lg" : ""}`}>
      <span className="logo-mark">TT</span>
      {isLg && <span className="logo-text">TeamTask</span>}
    </div>
  );
}
