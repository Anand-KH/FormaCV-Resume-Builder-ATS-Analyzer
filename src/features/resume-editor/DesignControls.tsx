import {
  Check,
  Colorize,
  FormatAlignCenter,
  FormatAlignJustify,
  FormatAlignLeft,
  FormatAlignRight,
} from "@mui/icons-material";
import {
  Box,
  ButtonBase,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { Controller, type Control, type FieldPath } from "react-hook-form";
import { templateOptions, type Resume } from "../../domain/resume/types";
import { TemplateThumbnail } from "../templates/TemplateThumbnail";

const accentPresets = [
  { value: "#1a4b73", label: "Navy" },
  { value: "#28766a", label: "Teal" },
  { value: "#203b37", label: "Forest" },
  { value: "#7a3b2e", label: "Brick" },
  { value: "#5b3f9a", label: "Plum" },
  { value: "#a32d5c", label: "Berry" },
  { value: "#333a3f", label: "Graphite" },
];

type Option<T> = { value: T; label: ReactNode; title: string };

function Segmented<T extends string | number>({
  control,
  name,
  label,
  options,
}: {
  control: Control<Resume>;
  name: FieldPath<Resume>;
  label: string;
  options: Option<T>[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Box className="design-field">
          <Typography className="design-label">{label}</Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            className="design-segmented"
            value={field.value}
            aria-label={label}
            onChange={(_, value: T | null) => {
              if (value !== null) field.onChange(value);
            }}
          >
            {options.map((option) => (
              <ToggleButton
                key={String(option.value)}
                value={option.value}
                aria-label={option.title}
                title={option.title}
              >
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}
    />
  );
}

/** Visual "Look & feel" controls: template thumbnails, color swatches, segmented options. */
export function DesignControls({ control }: { control: Control<Resume> }) {
  return (
    <Box className="design-controls">
      <Controller
        control={control}
        name="design.template"
        render={({ field }) => (
          <Box className="design-field">
            <Typography className="design-label">Template</Typography>
            <Box className="template-grid" role="radiogroup" aria-label="Template">
              {templateOptions.map((option) => {
                const selected = field.value === option.value;
                return (
                  <ButtonBase
                    key={option.value}
                    role="radio"
                    aria-checked={selected}
                    title={option.label}
                    className={`template-tile${selected ? " is-selected" : ""}`}
                    onClick={() => field.onChange(option.value)}
                  >
                    <TemplateThumbnail
                      template={option.value}
                      width={46}
                      height={58}
                    />
                    <span className="template-tile-label">{option.label}</span>
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>
        )}
      />

      <Controller
        control={control}
        name="design.accentColor"
        render={({ field }) => {
          const isCustom = !accentPresets.some(
            (preset) => preset.value === field.value,
          );
          return (
            <Box className="design-field">
              <Typography className="design-label">Accent color</Typography>
              <Box className="swatches" role="radiogroup" aria-label="Accent color">
                {accentPresets.map((preset) => {
                  const selected = field.value === preset.value;
                  return (
                    <Tooltip key={preset.value} title={preset.label}>
                      <ButtonBase
                        role="radio"
                        aria-checked={selected}
                        aria-label={preset.label}
                        className={`swatch${selected ? " is-selected" : ""}`}
                        style={{ background: preset.value }}
                        onClick={() => field.onChange(preset.value)}
                      >
                        {selected && <Check fontSize="inherit" />}
                      </ButtonBase>
                    </Tooltip>
                  );
                })}
                <Tooltip title="Custom color">
                  <label
                    className={`swatch swatch-custom${isCustom ? " is-selected" : ""}`}
                    style={isCustom ? { background: field.value } : undefined}
                  >
                    {isCustom ? <Check fontSize="inherit" /> : <Colorize fontSize="inherit" />}
                    <input
                      type="color"
                      aria-label="Custom accent color"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </label>
                </Tooltip>
              </Box>
            </Box>
          );
        }}
      />

      <Segmented
        control={control}
        name="design.fontFamily"
        label="Typeface"
        options={[
          { value: "sans", label: <span className="font-sample-sans">Sans</span>, title: "Sans serif" },
          { value: "serif", label: <span className="font-sample-serif">Serif</span>, title: "Serif" },
          { value: "system", label: <span className="font-sample-system">Arial</span>, title: "Arial" },
        ]}
      />
      <Segmented
        control={control}
        name="design.fontSize"
        label="Text size"
        options={[
          { value: 9, label: "S", title: "Compact text" },
          { value: 10, label: "M", title: "Standard text" },
          { value: 11, label: "L", title: "Comfortable text" },
        ]}
      />
      <Segmented
        control={control}
        name="design.spacing"
        label="Line spacing"
        options={[
          { value: "compact", label: "Tight", title: "Compact spacing" },
          { value: "comfortable", label: "Normal", title: "Comfortable spacing" },
          { value: "relaxed", label: "Airy", title: "Relaxed spacing" },
        ]}
      />
      <Segmented
        control={control}
        name="design.margin"
        label="Page margins"
        options={[
          { value: "compact", label: "Narrow", title: "Narrow margins" },
          { value: "standard", label: "Normal", title: "Standard margins" },
          { value: "wide", label: "Wide", title: "Wide margins" },
        ]}
      />
      <Segmented
        control={control}
        name="design.headingStyle"
        label="Headings"
        options={[
          { value: "uppercase", label: "AB", title: "Uppercase headings" },
          { value: "title", label: "Ab", title: "Title case headings" },
          { value: "underline", label: <u>Ab</u>, title: "Underlined headings" },
        ]}
      />
      <Segmented
        control={control}
        name="design.summaryAlignment"
        label="Text alignment"
        options={[
          { value: "left", label: <FormatAlignLeft fontSize="small" />, title: "Align left" },
          { value: "center", label: <FormatAlignCenter fontSize="small" />, title: "Align center" },
          { value: "right", label: <FormatAlignRight fontSize="small" />, title: "Align right" },
          { value: "justify", label: <FormatAlignJustify fontSize="small" />, title: "Justify" },
        ]}
      />
    </Box>
  );
}
