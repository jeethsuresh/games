# Puzzle Games

A Next.js application hosting a collection of word and number puzzle games, similar to NYT Connections or Countdown.

## Features

- **Modular Game Architecture**: Each game is self-contained in its own folder
- **Sidebar Navigation**: Easy navigation between games
- **Modern UI**: Built with Tailwind CSS
- **Type-Safe**: Full TypeScript support

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Adding a New Game

1. Create a new folder in `app/games/` with your game name (e.g., `app/games/my-game/`)
2. Create your game component in that folder
3. Export your component from the game file
4. Register your game in `app/games/games.config.ts`:

```typescript
{
  id: "my-game",
  name: "My Game",
  description: "A description of my game",
  component: MyGameComponent,
}
```

## Games

- **Number Puzzle**: Use numbers and operations to reach a target
- **Wordle**: Guess the 5-letter word

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS

