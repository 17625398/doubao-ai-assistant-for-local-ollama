import React, { useState } from "react"
import { Button, Input, Card, message, Space, Alert, Divider, Collapse } from "antd"
import { Terminal, Play, X, Copy, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { getOpenCLIClient } from "@/libs/opencli"
import { useStorage } from "@plasmohq/storage/hook"

const { TextArea } = Input

interface OpenCLIFormProps {
  onClose: () => void
}

export const OpenCLIForm: React.FC<OpenCLIFormProps> = ({ onClose }) => {
  const { t } = useTranslation(["playground", "common"])
  const [command, setCommand] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const [daemonStatus, setDaemonStatus] = useState<{ ok: boolean; pid: number } | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [history, setHistory] = useStorage<string[]>("opencliCommandHistory", [])

  const client = getOpenCLIClient()

  const checkDaemonStatus = async () => {
    try {
      const status = await client.getStatus()
      setDaemonStatus(status)
      if (!status?.ok) {
        message.error(t("opencli.daemonNotRunning"))
      }
    } catch (err) {
      setDaemonStatus(null)
      message.error(t("opencli.daemonNotRunning"))
    }
  }

  const executeCommand = async () => {
    if (!command.trim()) {
      message.warning(t("opencli.emptyCommand"))
      return
    }

    setIsExecuting(true)
    setOutput("")
    setError("")

    try {
      // Check daemon status before executing
      await checkDaemonStatus()
      if (!daemonStatus?.ok) {
        return
      }

      // Execute the command
      const result = await client.exec(command)
      
      // Format output
      const formattedOutput = typeof result === "object" 
        ? JSON.stringify(result, null, 2)
        : String(result)
      
      setOutput(formattedOutput)
      
      // Add to history
      if (!history.includes(command)) {
        const newHistory = [command, ...history.slice(0, 9)] // Keep only last 10 commands
        setHistory(newHistory)
      }
      
      message.success(t("opencli.commandExecuted"))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      message.error(t("opencli.commandFailed"))
    } finally {
      setIsExecuting(false)
    }
  }

  const handleCommandChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommand(e.target.value)
  }

  const handleHistoryClick = (cmd: string) => {
    setCommand(cmd)
  }

  const copyOutput = () => {
    if (output) {
      navigator.clipboard.writeText(output)
      message.success(t("common:copyToClipboard"))
    }
  }

  const clearOutput = () => {
    setOutput("")
    setError("")
  }

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <span>{t("opencli.title")}</span>
          </div>
          <Button type="text" icon={<X />} onClick={onClose} />
        </div>
      }
      className="w-full max-w-2xl mx-auto"
    >
      <div className="space-y-4">
        {/* Command input */}
        <div>
          <TextArea
            value={command}
            onChange={handleCommandChange}
            placeholder={t("opencli.placeholder")}
            rows={4}
            disabled={isExecuting}
            className="font-mono"
          />
        </div>

        {/* History */}
        {history.length > 0 && (
          <Collapse defaultActiveKey={[]}>
            <Collapse.Panel header={t("opencli.history")} key="1">
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {history.map((cmd, index) => (
                  <div
                    key={index}
                    className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-mono"
                    onClick={() => handleHistoryClick(cmd)}
                  >
                    {cmd}
                  </div>
                ))}
              </div>
            </Collapse.Panel>
          </Collapse>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 justify-end">
          <Button
            type="primary"
            icon={<Play />}
            onClick={executeCommand}
            loading={isExecuting}
            disabled={!command.trim()}
          >
            {t("opencli.execute")}
          </Button>
          <Button icon={<RefreshCw />} onClick={checkDaemonStatus} />
          <Button icon={<X />} onClick={() => setCommand("")} />
        </div>

        {/* Daemon status */}
        <div>
          {daemonStatus ? (
            <Alert
              message={t("opencli.daemonStatus", { status: "Running", pid: daemonStatus.pid })}
              type="success"
              showIcon
              className="mb-4"
            />
          ) : (
            <Alert
              message={t("opencli.daemonStatus", { status: "Not Running", pid: "N/A" })}
              type="warning"
              showIcon
              className="mb-4"
            />
          )}
        </div>

        {/* Output */}
        <Divider>{t("opencli.output")}</Divider>
        <div className="relative">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400">
              <pre className="whitespace-pre-wrap font-mono text-sm">{error}</pre>
            </div>
          ) : output ? (
            <div className="bg-gray-50 border border-gray-200 rounded p-3 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t("opencli.result")}</span>
                <Button type="text" icon={<Copy />} size="small" onClick={copyOutput} />
              </div>
              <pre className="whitespace-pre-wrap font-mono text-sm">{output}</pre>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded p-3 h-32 flex items-center justify-center dark:bg-gray-800 dark:border-gray-700">
              <span className="text-gray-400 dark:text-gray-500">{t("opencli.noOutput")}</span>
            </div>
          )}
          {(output || error) && (
            <Button
              type="text"
              icon={<X />}
              size="small"
              onClick={clearOutput}
              className="absolute top-2 right-2"
            />
          )}
        </div>

        {/* Help */}
        <Collapse defaultActiveKey={[]}>
          <Collapse.Panel header={t("opencli.help")} key="2">
            <div className="space-y-2 text-sm">
              <p>{t("opencli.helpText1")}</p>
              <p>{t("opencli.helpText2")}</p>
              <p>{t("opencli.helpText3")}</p>
              <div className="bg-gray-50 p-2 rounded font-mono text-xs">
                <div>{t("opencli.helpExample1")}</div>
                <div>{t("opencli.helpExample2")}</div>
                <div>{t("opencli.helpExample3")}</div>
              </div>
            </div>
          </Collapse.Panel>
        </Collapse>
      </div>
    </Card>
  )
}
