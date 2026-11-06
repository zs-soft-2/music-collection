# UI contract: `mc-image-url-preview`

**Import**: `@music-collection/ui/image-url-preview` · **Source**: `libs/ui/src/lib/image-url-preview/`

Previews the picture at an entered address, and says so when it cannot be loaded.

## Inputs

| Input | Type | Required | Meaning |
|---|---|---|---|
| `url` | `string \| null \| undefined` | yes | The entered address. Empty means no preview. |
| `alt` | `string` | yes | Alternative text, translated by the caller |

There are no outputs: the component never touches the form value or its validity (FR-004).

## Behaviour

| Situation | Rendered |
|---|---|
| `url` empty | No picture, no message |
| `url` set, not failed | `p-image` with `src = url`, `preview`, `width = 200`, class `mc-form-image`, as the forms have today |
| The picture reports an error | The message instead of `p-image` |
| `url` changes | The earlier outcome is dropped, and the new address is tried |

The `role="status"` container is always rendered. The message goes inside it, with the key `ui.imageUrlPreview.could-not-load` (hu, en, de).

## Use

The artist form passes `imageUrl`, and the album form passes `coverImageUrl`. Each replaces its `@if … <p-image>` block and keeps its current `alt` key.

```html
<mc-image-url-preview
	[url]="params.formGroup.value.imageUrl"
	[alt]="'ui.artistForm.photo' | transloco"
/>
```

The label, musician and music-collection cover forms do not use it (out of scope).

## Test hooks

The tests find the picture as `mc-image-url-preview img`, trigger failure with `dispatchEvent(new Event('error'))` on it, and find the message by its translated text inside `[role="status"]`.
