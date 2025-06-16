'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Color = 'rojo' | 'azul' | 'verde' | 'amarillo';
type ColorHex = '#ef4444' | '#3b82f6' | '#22c55e' | '#eab308';

interface Stimulus {
  word: Color;
  color: ColorHex;
  isCongruent: boolean;
}

interface Response {
  stimulus: Stimulus;
  responseTime: number;
  isCorrect: boolean;
  keyPressed: string;
}

interface BlockResults {
  responses: Response[];
  congruentCorrect: number;
  congruentTotal: number;
  incongruentCorrect: number;
  incongruentTotal: number;
  congruentAvgTime: number;
  incongruentAvgTime: number;
}

const colorMap: Record<Color, ColorHex> = {
  rojo: '#ef4444',
  azul: '#3b82f6',
  verde: '#22c55e',
  amarillo: '#eab308'
};

const keyMap: Record<string, Color> = {
  r: 'rojo',
  a: 'azul',
  v: 'verde',
  z: 'amarillo'
};

const colors: Color[] = ['rojo', 'azul', 'verde', 'amarillo'];

export default function StroopExperiment() {
  const [gameState, setGameState] = useState<
    'instructions' | 'block1' | 'pause' | 'block2' | 'results'
  >('instructions');
  const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null);
  const [stimulusStartTime, setStimulusStartTime] = useState<number>(0);
  const [currentStimulusIndex, setCurrentStimulusIndex] = useState(0);
  const [currentBlock, setCurrentBlock] = useState<Stimulus[]>([]);
  const [block1Results, setBlock1Results] = useState<Response[]>([]);
  const [block2Results, setBlock2Results] = useState<Response[]>([]);
  const [pauseTimeLeft, setPauseTimeLeft] = useState(10);
  const [showFixation, setShowFixation] = useState(false);

  // Generar estímulos para un bloque
  const generateBlock = useCallback((): Stimulus[] => {
    const stimuli: Stimulus[] = [];

    // 30 congruentes
    for (let i = 0; i < 30; i++) {
      const color = colors[i % 4];
      stimuli.push({
        word: color,
        color: colorMap[color],
        isCongruent: true
      });
    }

    // 30 incongruentes
    for (let i = 0; i < 30; i++) {
      const word = colors[i % 4];
      let color: Color;
      do {
        color = colors[Math.floor(Math.random() * 4)];
      } while (color === word);

      stimuli.push({
        word,
        color: colorMap[color],
        isCongruent: false
      });
    }

    // Mezclar aleatoriamente
    return stimuli.sort(() => Math.random() - 0.5);
  }, []);

  // Iniciar bloque
  const startBlock = useCallback(
    (blockNumber: 1 | 2) => {
      const newBlock = generateBlock();
      setCurrentBlock(newBlock);
      setCurrentStimulusIndex(0);
      setGameState(blockNumber === 1 ? 'block1' : 'block2');

      // Mostrar cruz de fijación antes del primer estímulo
      setShowFixation(true);
      setTimeout(() => {
        setShowFixation(false);
        setCurrentStimulus(newBlock[0]);
        setStimulusStartTime(performance.now());

        // Cambiar el estímulo a blanco después de 0.75 segundos
        setTimeout(() => {
          setCurrentStimulus({
            word: '',
            color: '#ffffff',
            isCongruent: false
          });
        }, 750);
      }, 1000);
    },
    [generateBlock]
  );

  // Manejar respuesta
  const handleResponse = useCallback(
    (key: string) => {
      if (!currentStimulus || showFixation) return;

      const responseTime = performance.now() - stimulusStartTime;
      const expectedColor = Object.keys(colorMap).find(
        (color) => colorMap[color as Color] === currentStimulus.color
      ) as Color;
      const isCorrect = keyMap[key.toLowerCase()] === expectedColor;

      const response: Response = {
        stimulus: currentStimulus,
        responseTime,
        isCorrect,
        keyPressed: key
      };

      if (gameState === 'block1') {
        setBlock1Results((prev) => [...prev, response]);
      } else {
        setBlock2Results((prev) => [...prev, response]);
      }

      // Siguiente estímulo
      const nextIndex = currentStimulusIndex + 1;
      if (nextIndex < currentBlock.length) {
        setCurrentStimulusIndex(nextIndex);
        setShowFixation(true);
        setCurrentStimulus(null);

        setTimeout(() => {
          setShowFixation(false);
          setCurrentStimulus(currentBlock[nextIndex]);
          setStimulusStartTime(performance.now());

          // Cambiar el estímulo a blanco después de 0.75 segundos
          setTimeout(() => {
            setCurrentStimulus({
              word: '',
              color: '#ffffff',
              isCongruent: false
            });
          }, 750);
        }, 500);
      } else {
        // Bloque terminado
        if (gameState === 'block1') {
          setGameState('pause');
          setPauseTimeLeft(10);
        } else {
          setGameState('results');
        }
        setCurrentStimulus(null);
      }
    },
    [
      currentStimulus,
      stimulusStartTime,
      showFixation,
      gameState,
      currentStimulusIndex,
      currentBlock
    ]
  );

  // Efectos de teclado
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['r', 'a', 'v', 'z'].includes(key)) {
        handleResponse(key);
      }
    };

    if (gameState === 'block1' || gameState === 'block2') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [gameState, handleResponse]);

  // Timer de pausa
  useEffect(() => {
    if (gameState === 'pause' && pauseTimeLeft > 0) {
      const timer = setTimeout(() => {
        setPauseTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'pause' && pauseTimeLeft === 0) {
      startBlock(2);
    }
  }, [gameState, pauseTimeLeft, startBlock]);

  // Calcular resultados
  const calculateResults = (responses: Response[]): BlockResults => {
    const congruentResponses = responses.filter((r) => r.stimulus.isCongruent);
    const incongruentResponses = responses.filter(
      (r) => !r.stimulus.isCongruent
    );

    const congruentCorrect = congruentResponses.filter((r) => r.isCorrect);
    const incongruentCorrect = incongruentResponses.filter((r) => r.isCorrect);

    const congruentAvgTime =
      congruentCorrect.length > 0
        ? congruentCorrect.reduce((sum, r) => sum + r.responseTime, 0) /
          congruentCorrect.length
        : 0;

    const incongruentAvgTime =
      incongruentCorrect.length > 0
        ? incongruentCorrect.reduce((sum, r) => sum + r.responseTime, 0) /
          incongruentCorrect.length
        : 0;

    return {
      responses,
      congruentCorrect: congruentCorrect.length,
      congruentTotal: congruentResponses.length,
      incongruentCorrect: incongruentCorrect.length,
      incongruentTotal: incongruentResponses.length,
      congruentAvgTime,
      incongruentAvgTime
    };
  };

  const block1Stats = calculateResults(block1Results);
  const block2Stats = calculateResults(block2Results);
  const totalStats = calculateResults([...block1Results, ...block2Results]);

  const progress =
    gameState === 'block1' || gameState === 'block2'
      ? (currentStimulusIndex / currentBlock.length) * 100
      : 0;

  return (
    <div
      className="fixed inset-0 bg-white text-black flex items-center justify-center p-4 overflow-auto"
      style={{ backgroundColor: '#ffffff' }}
    >
      {gameState === 'instructions' && (
        <Card className="bg-white border-gray-300 max-w-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-black">
              Instrucciones del Experimento Stroop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-black">
            <p>
              En este experimento verás palabras de colores mostradas en
              diferentes colores.
            </p>
            <p>
              <strong>Tu tarea:</strong> Presiona la tecla que corresponde al
              COLOR en que está escrita la palabra, NO la palabra misma.
            </p>
            <p className="text-center font-semibold">
              Puedes usar las teclas del teclado o hacer clic en los botones de
              colores.
            </p>

            <div className="grid grid-cols-2 gap-4 my-6">
              <div className="text-center">
                <Button
                  className="h-12 bg-red-500 hover:bg-red-600 text-white font-bold mb-2"
                  disabled
                >
                  R
                </Button>
                <div>ROJO</div>
              </div>
              <div className="text-center">
                <Button
                  className="h-12 bg-blue-500 hover:bg-blue-600 text-white font-bold mb-2"
                  disabled
                >
                  A
                </Button>
                <div>AZUL</div>
              </div>
              <div className="text-center">
                <Button
                  className="h-12 bg-green-500 hover:bg-green-600 text-white font-bold mb-2"
                  disabled
                >
                  V
                </Button>
                <div>VERDE</div>
              </div>
              <div className="text-center">
                <Button
                  className="h-12 bg-yellow-500 hover:bg-yellow-600 text-white font-bold mb-2"
                  disabled
                >
                  Z
                </Button>
                <div>AMARILLO</div>
              </div>
            </div>

            <p>
              Ejemplo: Si ves la palabra &quot;VERDE&quot; escrita en color
              rojo, presiona <strong>R</strong> (por el color rojo).
            </p>
            <p>Responde lo más rápido y preciso posible.</p>

            <div className="text-center mt-6">
              <Button
                onClick={() => startBlock(1)}
                className="bg-green-600 hover:bg-green-700"
              >
                Comenzar Experimento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(gameState === 'block1' || gameState === 'block2') && (
        <div className="text-center w-full max-w-4xl">
          <div className="mb-4">
            <Progress value={progress} className="w-full h-2" />
            <p className="mt-2 text-sm text-black">
              Bloque {gameState === 'block1' ? '1' : '2'} - Estímulo{' '}
              {currentStimulusIndex + 1} de {currentBlock.length}
            </p>
          </div>

          <div className="h-64 flex items-center justify-center">
            {showFixation ? (
              <div className="text-6xl text-black">+</div>
            ) : currentStimulus ? (
              <div
                className="text-8xl font-bold"
                style={{ color: currentStimulus.color }}
              >
                {currentStimulus.word.toUpperCase()}
              </div>
            ) : null}
          </div>

          <div className="mt-8 grid grid-cols-4 gap-4 max-w-md mx-auto">
            <Button
              onClick={() => handleResponse('r')}
              className="h-16 bg-red-500 hover:bg-red-600 text-white font-bold text-lg"
              disabled={showFixation || !currentStimulus}
            >
              <div className="text-center">
                <div className="text-xl">R</div>
                <div className="text-xs">ROJO</div>
              </div>
            </Button>
            <Button
              onClick={() => handleResponse('a')}
              className="h-16 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg"
              disabled={showFixation || !currentStimulus}
            >
              <div className="text-center">
                <div className="text-xl">A</div>
                <div className="text-xs">AZUL</div>
              </div>
            </Button>
            <Button
              onClick={() => handleResponse('v')}
              className="h-16 bg-green-500 hover:bg-green-600 text-white font-bold text-lg"
              disabled={showFixation || !currentStimulus}
            >
              <div className="text-center">
                <div className="text-xl">V</div>
                <div className="text-xs">VERDE</div>
              </div>
            </Button>
            <Button
              onClick={() => handleResponse('z')}
              className="h-16 bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-lg"
              disabled={showFixation || !currentStimulus}
            >
              <div className="text-center">
                <div className="text-xl">Z</div>
                <div className="text-xs">AMARILLO</div>
              </div>
            </Button>
          </div>
        </div>
      )}

      {gameState === 'pause' && (
        <Card className="bg-white border-gray-300 text-center shadow-lg">
          <CardContent className="pt-6">
            <h2 className="text-2xl mb-4 text-black">Descanso</h2>
            <p className="text-lg mb-4 text-black">Bloque 1 completado</p>
            <p className="text-3xl font-bold text-red-600">{pauseTimeLeft}</p>
            <p className="mt-2 text-black">
              El Bloque 2 comenzará automáticamente
            </p>
          </CardContent>
        </Card>
      )}

      {gameState === 'results' && (
        <Card className="bg-white border-gray-300 max-w-4xl w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-black">
              Resultados del Experimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Resultados Totales */}
              <div className="bg-gray-100 p-4 rounded-lg border">
                <h3 className="text-lg font-bold mb-3 text-center text-black">
                  Resultados Totales
                </h3>
                <div className="space-y-2 text-sm text-black">
                  <div>
                    Total estímulos: <span className="font-bold">120</span>
                  </div>
                  <div>
                    Respuestas correctas:{' '}
                    <span className="font-bold text-green-400">
                      {totalStats.congruentCorrect +
                        totalStats.incongruentCorrect}
                    </span>
                  </div>
                  <div>
                    Respuestas incorrectas:{' '}
                    <span className="font-bold text-red-400">
                      {120 -
                        (totalStats.congruentCorrect +
                          totalStats.incongruentCorrect)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-600">
                    <div>
                      Tiempo promedio congruentes:{' '}
                      <span className="font-bold">
                        {Math.round(totalStats.congruentAvgTime)}ms
                      </span>
                    </div>
                    <div>
                      Tiempo promedio incongruentes:{' '}
                      <span className="font-bold">
                        {Math.round(totalStats.incongruentAvgTime)}ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloque 1 */}
              <div className="bg-gray-100 p-4 rounded-lg border">
                <h3 className="text-lg font-bold mb-3 text-center text-black">
                  Bloque 1
                </h3>
                <div className="space-y-2 text-sm text-black">
                  <div>
                    Congruentes correctos:{' '}
                    <span className="font-bold">
                      {block1Stats.congruentCorrect}/
                      {block1Stats.congruentTotal}
                    </span>
                  </div>
                  <div>
                    Incongruentes correctos:{' '}
                    <span className="font-bold">
                      {block1Stats.incongruentCorrect}/
                      {block1Stats.incongruentTotal}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-600">
                    <div>
                      Tiempo congruentes:{' '}
                      <span className="font-bold">
                        {Math.round(block1Stats.congruentAvgTime)}ms
                      </span>
                    </div>
                    <div>
                      Tiempo incongruentes:{' '}
                      <span className="font-bold">
                        {Math.round(block1Stats.incongruentAvgTime)}ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloque 2 */}
              <div className="bg-gray-100 p-4 rounded-lg border">
                <h3 className="text-lg font-bold mb-3 text-center text-black">
                  Bloque 2
                </h3>
                <div className="space-y-2 text-sm text-black">
                  <div>
                    Congruentes correctos:{' '}
                    <span className="font-bold">
                      {block2Stats.congruentCorrect}/
                      {block2Stats.congruentTotal}
                    </span>
                  </div>
                  <div>
                    Incongruentes correctos:{' '}
                    <span className="font-bold">
                      {block2Stats.incongruentCorrect}/
                      {block2Stats.incongruentTotal}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-600">
                    <div>
                      Tiempo congruentes:{' '}
                      <span className="font-bold">
                        {Math.round(block2Stats.congruentAvgTime)}ms
                      </span>
                    </div>
                    <div>
                      Tiempo incongruentes:{' '}
                      <span className="font-bold">
                        {Math.round(block2Stats.incongruentAvgTime)}ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Efecto Stroop */}
            <div className="mt-6 bg-blue-100 p-4 rounded-lg text-center border">
              <h3 className="text-lg font-bold mb-2 text-black">
                Efecto Stroop
              </h3>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(
                  totalStats.incongruentAvgTime - totalStats.congruentAvgTime
                )}
                ms
              </p>
              <p className="text-sm mt-1 text-black">
                Diferencia promedio (Incongruente - Congruente)
              </p>
            </div>

            <div className="text-center mt-6">
              <Button
                onClick={() => {
                  setGameState('instructions');
                  setBlock1Results([]);
                  setBlock2Results([]);
                  setCurrentStimulusIndex(0);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Repetir Experimento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
