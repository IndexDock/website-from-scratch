export const siteConfig = {
  name: "IndexDock Starter",
  description: "Your IndexDock Starter website is live and ready for the guided build workflow.",
  siteUrl: null as string | null,
  primaryConversionPath: "/",
  courseUrl: "https://www.indexdock.com/en-US/school/website-from-scratch",
  repositoryUrl: "https://github.com/IndexDock/website-from-scratch",
  brandAssetOwner: "starter" as "starter" | "client",
  // The one icon weight the whole site uses, chosen to sit with its type. Phosphor's bold
  // stroke is 24 units in a 256 box, about 0.094em, which sits with this page's 700-weight
  // buttons and heavy display face. See agent/contracts/icons.md before changing it.
  iconWeight: "bold" as "thin" | "light" | "regular" | "bold" | "fill" | "duotone",
  // The one arrow shape family the site draws from, out of the three in
  // src/icons/selection.json. Straight arrows suit the geometric sans used here.
  arrowShape: "straight",
  faviconPath: "/indexdock-mark.svg",
  faviconType: "image/svg+xml",
  socialImagePath: "/indexdock-starter-social.png",
  socialImageAlt: "IndexDock Starter — your website journey starts here.",
  attribution: {
    label: "Built with IndexDock Starter",
    url: "https://www.indexdock.com/en-US/school/website-from-scratch?utm_source=indexdock-starter&utm_medium=referral&utm_campaign=starter-attribution",
  },
  indexingEnabled: false,
} as const;
