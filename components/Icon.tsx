export default function Icon({
  name = "arrow",
  className = "",
}: {
  name?: "arrow" | "home" | "tree" | "wave";
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={"icon " + className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "arrow" ? (
        <path d="M5 19 19 5M5 5h14v14" />
      ) : name === "home" ? (
        <path d="m3 11 9-8 9 8M6 9v12h12V9M10 21v-8h4v8" />
      ) : name === "tree" ? (
        <path d="m12 2-7 9h4l-6 7h8v4h2v-4h8l-6-7h4Z" />
      ) : (
        <path d="M2 8q5-5 10 0t10 0M2 16q5-5 10 0t10 0" />
      )}
    </svg>
  );
}
