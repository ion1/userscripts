import "./notification.css";

let visibleElem: Element | null = null;
let hideTimerId: number | null = null;

export function showNotification(params: {
  heading: string;
  description?: string;
  fadeOut?: boolean;
}): void {
  const containerElem = document.createElement("div");
  containerElem.setAttribute("class", "youtube-mute-skip-ads-notification");

  const notifElem = document.createElement("div");
  notifElem.setAttribute("aria-live", "assertive");
  notifElem.setAttribute("aria-atomic", "true");
  containerElem.appendChild(notifElem);

  const headerElem = document.createElement("div");
  headerElem.textContent = params.heading;
  notifElem.appendChild(headerElem);

  if (params.description != null) {
    const descrElem = document.createElement("div");
    descrElem.textContent = params.description ?? "";
    notifElem.appendChild(descrElem);
  }

  const footerElem = document.createElement("div");
  footerElem.textContent = "(Youtube Mute and Skip Ads)";
  notifElem.appendChild(footerElem);

  if (hideTimerId != null) {
    clearTimeout(hideTimerId);
    hideTimerId = null;
  }

  if (visibleElem != null) {
    document.body.removeChild(visibleElem);
    visibleElem = null;
  }

  document.body.append(containerElem);
  visibleElem = containerElem;

  if (params.fadeOut) {
    containerElem.classList.add("fade-out");

    hideTimerId = setTimeout(() => {
      document.body.removeChild(containerElem);
      visibleElem = null;
      hideTimerId = null;
    }, 3000);
  }
}
