// GitHub octicon SVG components extracted from inline usages.
// Each accepts `size` (defaults to 16) and `className` for styling.

interface OcticonProps {
  size?: number;
  className?: string;
}

export function OcticonGitPullRequest({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible" }} className={className}>
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5 .75 .75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5 .75 .75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
    </svg>
  );
}

export function OcticonGitPullRequestClosed({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible" }} className={className}>
      <path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 5.5a.75.75 0 0 1 .75.75v3.378a2.251 2.251 0 1 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Zm-2.03-5.273a.75.75 0 0 1 1.06 0l.97.97.97-.97a.748.748 0 0 1 1.265.332.75.75 0 0 1-.205.729l-.97.97.97.97a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-.97-.97-.97.97a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l.97-.97-.97-.97a.75.75 0 0 1 0-1.06ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5 .75 .75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5 .75 .75 0 0 0 0-1.5Z" />
    </svg>
  );
}

export function OcticonRepoPush({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible" }} className={className}>
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V1.5h-8a1 1 0 0 0-1 1v6.708A2.493 2.493 0 0 1 4.5 9h2.25a.75.75 0 0 1 0 1.5H4.5a1 1 0 0 0 0 2h4.75a.75.75 0 0 1 0 1.5H4.5A2.5 2.5 0 0 1 2 11.5Zm12.23 7.79h-.001l-1.224-1.224v6.184a.75.75 0 0 1-1.5 0V9.066L10.28 10.29a.75.75 0 0 1-1.06-1.061l2.505-2.504a.75.75 0 0 1 1.06 0L15.29 9.23a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018Z" />
    </svg>
  );
}

export function OcticonGitCompare({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible" }} className={className}>
      <path d="M9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM6 12v-1.646a.25.25 0 0 1 .427-.177l2.396 2.396a.25.25 0 0 1 0 .354l-2.396 2.396A.25.25 0 0 1 6 15.146V13.5H5A2.5 2.5 0 0 1 2.5 11V5.372a2.25 2.25 0 1 1 1.5 0V11a1 1 0 0 0 1 1ZM4 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0ZM12.75 12a.75.75 0 1 0 0 1.5 .75 .75 0 0 0 0-1.5Z" />
    </svg>
  );
}

export function OcticonGitCommit({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible" }} className={className}>
      <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
    </svg>
  );
}

export function OcticonFileAdded({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible" }} className={className}>
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073Zm4.48 3.758a.75.75 0 0 1 .755.745l.01 1.497h1.497a.75.75 0 0 1 0 1.5H9v1.507a.75.75 0 0 1-1.5 0V9.005l-1.502.01a.75.75 0 0 1-.01-1.5l1.507-.01-.01-1.492a.75.75 0 0 1 .745-.755Z" />
    </svg>
  );
}

export function OcticonFileChanged({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible" }} className={className}>
      <path d="M1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073ZM8 3.25a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0V7h-1.5a.75.75 0 0 1 0-1.5h1.5V4A.75.75 0 0 1 8 3.25Zm-3 8a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export function OcticonFileRemoved({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible" }} className={className}>
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073Zm4.5 6h2.242a.75.75 0 0 1 0 1.5h-2.24l-2.254.015a.75.75 0 0 1-.01-1.5Z" />
    </svg>
  );
}

export function OcticonLog({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible" }} className={className}>
      <path d="M5 8.25a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4A.75.75 0 0 1 5 8.25ZM4 10.5A.75.75 0 0 0 4 12h4a.75.75 0 0 0 0-1.5H4Z" />
      <path d="M13-.005c1.654 0 3 1.328 3 3 0 .982-.338 1.933-.783 2.818-.443.879-1.028 1.758-1.582 2.588l-.011.017c-.568.853-1.104 1.659-1.501 2.446-.398.789-.623 1.494-.623 2.136a1.5 1.5 0 1 0 2.333-1.248.75.75 0 0 1 .834-1.246A3 3 0 0 1 13 16H3a3 3 0 0 1-3-3c0-1.582.891-3.135 1.777-4.506.209-.322.418-.637.623-.946.473-.709.923-1.386 1.287-2.048H2.51c-.576 0-1.381-.133-1.907-.783A2.68 2.68 0 0 1 0 2.995a3 3 0 0 1 3-3Zm0 1.5a1.5 1.5 0 0 0-1.5 1.5c0 .476.223.834.667 1.132A.75.75 0 0 1 11.75 5.5H5.368c-.467 1.003-1.141 2.015-1.773 2.963-.192.289-.381.571-.558.845C2.13 10.711 1.5 11.916 1.5 13A1.5 1.5 0 0 0 3 14.5h7.401A2.989 2.989 0 0 1 10 13c0-.979.338-1.928.784-2.812.441-.874 1.023-1.748 1.575-2.576l.017-.026c.568-.853 1.103-1.658 1.501-2.448.398-.79.623-1.497.623-2.143 0-.838-.669-1.5-1.5-1.5Zm-10 0a1.5 1.5 0 0 0-1.5 1.5c0 .321.1 .569 .27 .778.097 .12 .325 .227 .74 .227h7.674A2.737 2.737 0 0 1 10 2.995c0-.546.146-1.059.401-1.5Z" />
    </svg>
  );
}

export function OcticonCopy({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible" }} className={className}>
      <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
      <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
    </svg>
  );
}

export function OcticonGitMergeReady({ size = 24, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible", verticalAlign: "text-bottom" }} className={className}>
      <path d="M15 13.25a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm-12.5 6a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm0-14.5a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM5.75 6.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 6.5Zm0 14.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 21Zm12.5-6a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 18.25 15Z" />
      <path d="M6.5 7.25c0 2.9 2.35 5.25 5.25 5.25h4.5V14h-4.5A6.75 6.75 0 0 1 5 7.25Z" />
      <path d="M5.75 16.75A.75.75 0 0 1 5 16V8a.75.75 0 0 1 1.5 0v8a.75.75 0 0 1-.75.75Z" />
    </svg>
  );
}

export function OcticonBookmark({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible" }} className={className}>
      <path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.751.751 0 0 1 3 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.91l3.023-2.489a.75.75 0 0 1 .954 0l3.023 2.49V2.75a.25.25 0 0 0-.25-.25Z"></path>
    </svg>
  );
}

export function OcticonCrossReference({ size = 16, className }: OcticonProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ overflow: "visible", verticalAlign: "text-bottom" }} className={className}>
      <path d="M2.75 3.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 13H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 14.543V13H2.75A1.75 1.75 0 0 1 1 11.25v-7.5C1 2.784 1.784 2 2.75 2h5.5a.75.75 0 0 1 0 1.5ZM16 1.25v4.146a.25.25 0 0 1-.427.177L14.03 4.03l-3.75 3.75a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l3.75-3.75-1.543-1.543A.25.25 0 0 1 11.604 1h4.146a.25.25 0 0 1 .25.25Z"></path>
    </svg>
  );
}
