import Canvas from "./widgets/Canvas";
import './App.css';

function App() {

  return (
    <div>
      <h1>Canvas?</h1>
      <div>
        <Canvas height={480} width={640} frame={(context, since) => {
          context.fillStyle = '#000000';
          context.fillRect(0, 0, context.canvas.width, context.canvas.height);

          const w_size = context.canvas.width / 4;
          const h_size = context.canvas.height / 4;
          context.fillStyle = '#aaffaa';
          context.fillRect(w_size, h_size, context.canvas.width - (w_size * 2), context.canvas.height - (h_size * 2));
        }} />
      </div>
    </div>
  );
}

export default App;
