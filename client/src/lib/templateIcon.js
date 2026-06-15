import {
  Lightbulb,
  Map,
  Microscope,
  Footprints,
  RefreshCw,
  Target,
  Network,
  LayoutTemplate,
} from "lucide-react";

// Maps a template's `thumbnail` icon-name to a lucide component.
const ICONS = { Lightbulb, Map, Microscope, Footprints, RefreshCw, Target, Network };

export function templateIcon(name) {
  return ICONS[name] || LayoutTemplate;
}
