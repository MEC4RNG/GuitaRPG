import type { NavigationItem } from "@/lib/navigation";

type NavigationIconProps = {
  icon: NavigationItem["icon"];
};

const paths: Record<NavigationItem["icon"], React.ReactNode> = {
  home: <path d="M3 10.8 12 3l9 7.8V21h-6v-6H9v6H3V10.8Z" />,
  generate: (
    <>
      <path d="M12 2v20M2 12h20" />
      <path d="m17.5 4.5 2 2M4.5 17.5l2 2" />
    </>
  ),
  training: (
    <>
      <path d="M5 7h14M5 17h14M8 4v6M16 14v6" />
      <circle cx="8" cy="7" r="2" />
      <circle cx="16" cy="17" r="2" />
    </>
  ),
  character: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4.2 3.5-6 8-6s7.2 1.8 8 6" />
    </>
  ),
  skills: (
    <>
      <path d="m4 18 5-5M15 7l5-5M13 9l2-2M2 20l2-2" />
      <path d="m9 13 6 6 4-4-6-6" />
      <path d="m5 5 4-3 3 3-3 4-4-4Z" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  codex: (
    <>
      <path d="M4 4h7a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 1V4Z" />
      <path d="M20 4h-3a3 3 0 0 0-3 3v13h3a3 3 0 0 1 3 1V4Z" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21c.8-4 3.1-6 7-6s6.2 2 7 6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19 13.5v-3l-2-.7a7 7 0 0 0-.7-1.7l.9-2-2.2-2.2-2 .9a7 7 0 0 0-1.7-.7L10.5 2h-3l-.7 2a7 7 0 0 0-1.7.7l-2-.9L.9 6l.9 2a7 7 0 0 0-.7 1.7l-2 .7v3l2 .7a7 7 0 0 0 .7 1.7l-.9 2L3.1 20l2-.9a7 7 0 0 0 1.7.7l.7 2h3l.7-2a7 7 0 0 0 1.7-.7l2 .9 2.2-2.2-.9-2a7 7 0 0 0 .7-1.7l2.1-.6Z"
        transform="translate(2.5 0)"
      />
    </>
  ),
};

export function NavigationIcon({ icon }: NavigationIconProps) {
  return (
    <svg
      aria-hidden="true"
      className="nav-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      {paths[icon]}
    </svg>
  );
}
