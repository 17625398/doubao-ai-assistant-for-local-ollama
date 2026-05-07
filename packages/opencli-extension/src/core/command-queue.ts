import type { CliCommand, CommandArgs } from './registry.js';
import { executeCommand } from './execution.js';
import { log } from './logger.js';

export interface QueuedCommand {
  id: string;
  command: CliCommand;
  args: CommandArgs;
  debug: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: unknown;
  error?: Error;
  startedAt?: number;
  completedAt?: number;
}

export class CommandQueue {
  private queue: QueuedCommand[] = [];
  private isRunning = false;
  private isPaused = false;
  private currentCommand: QueuedCommand | null = null;
  private resolveQueue?: () => void;
  private rejectQueue?: (error: Error) => void;

  /**
   * Add a command to the queue
   */
  add(command: CliCommand, args: CommandArgs, debug: boolean = false): string {
    const id = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queuedCommand: QueuedCommand = {
      id,
      command,
      args,
      debug,
      status: 'pending'
    };
    this.queue.push(queuedCommand);
    log.debug(`Added command ${command.name} to queue with id ${id}`);
    
    // Start processing if queue is not running
    if (!this.isRunning) {
      this.processQueue();
    }
    
    return id;
  }

  /**
   * Add multiple commands to the queue
   */
  addBatch(commands: Array<{ command: CliCommand; args: CommandArgs; debug?: boolean }>): string[] {
    return commands.map(cmd => this.add(cmd.command, cmd.args, cmd.debug ?? false));
  }

  /**
   * Pause the queue
   */
  pause(): void {
    this.isPaused = true;
    log.debug('Command queue paused');
  }

  /**
   * Resume the queue
   */
  resume(): void {
    this.isPaused = false;
    log.debug('Command queue resumed');
    if (!this.isRunning) {
      this.processQueue();
    }
  }

  /**
   * Cancel the entire queue
   */
  cancel(): void {
    // Cancel current command if running
    if (this.currentCommand) {
      this.currentCommand.status = 'cancelled';
      this.currentCommand = null;
    }
    
    // Mark all pending commands as cancelled
    this.queue.forEach(cmd => {
      if (cmd.status === 'pending') {
        cmd.status = 'cancelled';
      }
    });
    
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.rejectQueue) {
      this.rejectQueue(new Error('Command queue cancelled'));
      this.rejectQueue = undefined;
    }
    
    log.debug('Command queue cancelled');
  }

  /**
   * Get the current queue status
   */
  getStatus(): {
    isRunning: boolean;
    isPaused: boolean;
    queueLength: number;
    currentCommand: QueuedCommand | null;
    queue: QueuedCommand[];
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      queueLength: this.queue.length,
      currentCommand: this.currentCommand,
      queue: [...this.queue]
    };
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isRunning || this.isPaused || this.queue.length === 0) {
      return;
    }

    this.isRunning = true;

    try {
      while (this.queue.length > 0 && !this.isPaused) {
        const nextCommand = this.queue.shift();
        if (!nextCommand) break;

        this.currentCommand = nextCommand;
        nextCommand.status = 'running';
        nextCommand.startedAt = Date.now();

        log.debug(`Starting command ${nextCommand.command.name} (${nextCommand.id})`);

        try {
          nextCommand.result = await executeCommand(nextCommand.command, nextCommand.args, nextCommand.debug);
          nextCommand.status = 'completed';
          nextCommand.completedAt = Date.now();
          log.debug(`Completed command ${nextCommand.command.name} (${nextCommand.id})`);
        } catch (error) {
          nextCommand.status = 'failed';
          nextCommand.error = error as Error;
          nextCommand.completedAt = Date.now();
          log.error(`Failed command ${nextCommand.command.name} (${nextCommand.id}): ${error instanceof Error ? error.message : error}`);
        }

        this.currentCommand = null;
      }

      // Queue is empty
      this.isRunning = false;
      if (this.resolveQueue) {
        this.resolveQueue();
        this.resolveQueue = undefined;
      }
    } catch (error) {
      this.isRunning = false;
      if (this.rejectQueue) {
        this.rejectQueue(error as Error);
        this.rejectQueue = undefined;
      }
    }
  }

  /**
   * Wait for the queue to complete
   */
  async waitForCompletion(): Promise<void> {
    if (!this.isRunning && this.queue.length === 0) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.resolveQueue = resolve;
      this.rejectQueue = reject;
    });
  }
}

// Export a singleton instance for convenience
export const commandQueue = new CommandQueue();
