import { getInitials } from "../utils/format";

export default function Avatar({ name, size = "sm" }) {
  return (
    <span className={`avatar avatar-${size}`} title={name}>
      {getInitials(name)}
    </span>
  );
}
