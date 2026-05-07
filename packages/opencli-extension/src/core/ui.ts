import chalk from 'chalk';
import ora from 'ora';

/**
 * 统一的用户界面输出工具
 * 提供清晰的命令执行反馈、错误处理和用户提示
 */
export class UI {
  private static spinner?: ReturnType<typeof ora>;

  /**
   * 显示成功消息
   */
  public static success(message: string): void {
    console.log(chalk.green('✅ ' + message));
  }

  /**
   * 显示错误消息
   */
  public static error(message: string): void {
    console.error(chalk.red('❌ ' + message));
  }

  /**
   * 显示警告消息
   */
  public static warn(message: string): void {
    console.log(chalk.yellow('⚠️  ' + message));
  }

  /**
   * 显示信息消息
   */
  public static info(message: string): void {
    console.log(chalk.blue('ℹ️  ' + message));
  }

  /**
   * 显示调试消息
   */
  public static debug(message: string): void {
    if (process.env.OPENCLI_VERBOSE) {
      console.log(chalk.dim('🔧 ' + message));
    }
  }

  /**
   * 开始加载指示器
   */
  public static startLoading(message: string): void {
    this.spinner = ora({ text: message, color: 'blue' }).start();
  }

  /**
   * 停止加载指示器并显示成功消息
   */
  public static stopLoadingSuccess(message: string): void {
    if (this.spinner) {
      this.spinner.succeed(chalk.green(message));
      this.spinner = undefined;
    }
  }

  /**
   * 停止加载指示器并显示错误消息
   */
  public static stopLoadingError(message: string): void {
    if (this.spinner) {
      this.spinner.fail(chalk.red(message));
      this.spinner = undefined;
    }
  }

  /**
   * 停止加载指示器并显示警告消息
   */
  public static stopLoadingWarn(message: string): void {
    if (this.spinner) {
      this.spinner.warn(chalk.yellow(message));
      this.spinner = undefined;
    }
  }

  /**
   * 显示命令执行结果
   */
  public static showCommandResult(success: boolean, output: string, error?: string): void {
    if (success) {
      this.success('Command executed successfully');
      if (output) {
        console.log('\n' + output);
      }
    } else {
      this.error('Command failed');
      if (error) {
        console.error('\n' + error);
      }
    }
  }

  /**
   * 显示表格数据
   */
  public static showTable(data: any[], columns: string[]): void {
    if (data.length === 0) {
      this.info('No data available');
      return;
    }

    // 计算每列的宽度
    const widths: { [key: string]: number } = {};
    columns.forEach(col => {
      widths[col] = Math.max(
        col.length,
        ...data.map(row => (row[col]?.toString() || '').length)
      );
    });

    // 显示表头
    console.log('');
    let header = '  ';
    columns.forEach(col => {
      header += chalk.bold(col.padEnd(widths[col] + 2));
    });
    console.log(header);

    // 显示分隔线
    let separator = '  ';
    columns.forEach(col => {
      separator += '-'.repeat(widths[col] + 2);
    });
    console.log(separator);

    // 显示数据行
    data.forEach(row => {
      let line = '  ';
      columns.forEach(col => {
        const value = row[col]?.toString() || '';
        line += value.padEnd(widths[col] + 2);
      });
      console.log(line);
    });

    console.log('');
  }

  /**
   * 显示命令执行时间
   */
  public static showExecutionTime(duration: number): void {
    console.log(chalk.dim(`Execution time: ${duration}ms`));
  }

  /**
   * 显示提示信息
   */
  public static showTip(message: string): void {
    console.log(chalk.dim('💡 Tip: ' + message));
  }

  /**
   * 显示分隔线
   */
  public static showSeparator(): void {
    console.log('');
    console.log(chalk.dim('-'.repeat(80)));
    console.log('');
  }

  /**
   * 显示命令帮助信息
   */
  public static showHelp(command: string, description: string, usage: string, options?: { [key: string]: string }): void {
    console.log('');
    console.log(chalk.bold(`Command: ${command}`));
    console.log(chalk.dim(`Description: ${description}`));
    console.log('');
    console.log(chalk.bold('Usage:'));
    console.log(`  ${usage}`);
    if (options) {
      console.log('');
      console.log(chalk.bold('Options:'));
      Object.entries(options).forEach(([option, desc]) => {
        console.log(`  ${option.padEnd(20)} ${desc}`);
      });
    }
    console.log('');
  }
}
