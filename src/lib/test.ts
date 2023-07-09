import { highlight, defaultTheme } from "./stx";

console.log(
	highlight(
		defaultTheme,
		"kotlin",
		`package no.telenor.webawesome.util.logbackconfigurer

import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.LoggerContext
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.ConsoleAppender

class LCtx(private val loggerContext: LoggerContext) {
	internal var fmt = InstallationContainer("default", Exception("By default"))
	var formatter: String
		get() = fmt.value
		set(value) {
			fmt = InstallationContainer(value, Exception("Set here"))
		}

	internal var fmts =
		mutableMapOf<String, InstallationContainer<SetupFormatter>>(
			"default" to InstallationContainer(DefaultFormatter(), Exception("By default"))
		)

	val formatters: Map<String, SetupFormatter>
		get() = mapOf(*fmts.map { it.key to it.value.value }.toTypedArray())

	fun addFormatter(name: String, formatter: SetupFormatter): LCtx {
		if (fmts.containsKey(name)) {
			throw Exception("A formatter with that name ($name) is already installed!")
		}
		fmts[name] = InstallationContainer(formatter, Exception("Added here"))
		return this
	}

	fun getFormatter(name: String): SetupFormatter? = fmts[name]?.value

	val levels = HashMap<String, Level>()

	private var isInstalled = false

	val installed: Boolean
		get() = isInstalled

	fun install() {
		if (isInstalled) {
			throw Exception("Logger configuration is already installed!")
		}

		if (!fmts.containsKey(fmt.value)) {
			throw Exception("Formatter '\${fmt.value}' was not found!", fmt.exception)
		}

		val appender = ConsoleAppender<ILoggingEvent>()
		appender.context = loggerContext
		appender.name = "console"

		try {
			fmts[fmt.value]!!.value.setup(loggerContext, appender, this)
		} catch (ex: Throwable) {
			throw Exception("Could not setup formatter '\${fmt.value}'", ex)
		}

		appender.start()

		val mainLogger = loggerContext.getLogger(Logger.ROOT_LOGGER_NAME)
		mainLogger.isAdditive = false
		mainLogger.addAppender(appender)

		for ((loggerName, level) in levels) {
			if (loggerName == "*") {
				mainLogger.level = level
				continue
			}
			val logger = loggerContext.getLogger(loggerName)
			logger.level = level
		}
	}
}
`,
	),
);
