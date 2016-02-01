#' Widget output function for use in Shiny
#'
#' @param outputId outputId
#' @param width width
#' @param height height
#' @export
stackedbarOutput <- function(outputId, width = '100%', height = '400px'){
  shinyWidgetOutput(outputId, 'stackedbargraph', width, height, package = 'streamgraph')
}


#' Widget render function for use in Shiny
#'
#' @param expr expr
#' @param env env
#' @param quoted quoted
#' @export
renderStackedbar <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  shinyRenderWidget(expr, stackedbarOutput, env, quoted = TRUE)
}
