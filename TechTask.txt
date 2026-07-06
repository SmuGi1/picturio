# Test Task — Image Editor (Vue 3)

We work in the printing industry, where preparing and adjusting images for output is everyday work. This task is a small browser-based image editor in that spirit. We're mainly interested in how you model the edits, not just the pixels.

Plan for roughly a day. Get the requirements working first; the bonus section is optional.

## Stack & setup

- Expected technologies
	- Vue 3
	- Vuetify 3
	- Pinia 
	- TypeScript
- Scaffold the app however you like.
- Using cropping library such as cropperjs is fine.
- It must run with `npm i && npm run dev`.

## Requirements

- [ ] Load an image via file upload.
- [ ] Crop uploaded image
- [ ] Adjust it with live sliders with a real-time preview.
	- [ ] brightness
	- [ ] contrast
	- [ ] saturation
- [ ] Reset / view original: a way back to the unedited image. Edits must stay non-destructive — keep the original and derive the preview rather than writing changes into the source.
- [ ] Export the result by downloading it.

## ★ Bonus (optional)

- [ ] Add at least one filter (greyscale, sepia, etc.).
- [ ] Export the operations as JSON alongside the image. It should describe applied operations so that that replaying them on the original image reproduces the result. You design the shape; be ready to explain it.

## Constraints & notes

- Editing must stay non-destructive;
- AI is allowed and encouraged. The design decisions (op model, pipeline, UX) are yours to explain.

## What to submit

- A link to git repo or zip file that runs with `npm i && npm run dev`.
- A short notes or comments on your key decisions and trade-offs, and whether you attempted the bonus (and how you modeled the operations, if so).