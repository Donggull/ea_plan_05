/**
 * SVG 다이어그램 생성 유틸리티
 *
 * 비즈니스 프레젠테이션용 SVG 다이어그램을 동적으로 생성합니다.
 * - 원형 다이어그램 (흑/황색)
 * - 프로세스 플로우 (화살표 연결)
 * - 타임라인 (수평 화살표)
 * - 점선 연결선
 */

export interface CircleNode {
  id: string
  label: string
  sublabel?: string
  color: 'black' | 'yellow' | 'white'
  size?: 'small' | 'medium' | 'large'
}

export interface Connection {
  from: string
  to: string
  type: 'solid' | 'dashed'
  label?: string
}

export interface DiagramConfig {
  width: number
  height: number
  nodes: CircleNode[]
  connections?: Connection[]
  layout?: 'horizontal' | 'vertical' | 'grid' | 'circular'
}

/**
 * 원형 노드 생성
 */
function createCircleNode(
  cx: number,
  cy: number,
  radius: number,
  node: CircleNode
): string {
  const fillColors = {
    black: '#2d2d2d',
    yellow: '#FFD700',
    white: '#FFFFFF'
  }

  const textColors = {
    black: '#FFFFFF',
    yellow: '#000000',
    white: '#000000'
  }

  const fill = fillColors[node.color]
  const textColor = textColors[node.color]
  const stroke = node.color === 'white' ? '#cccccc' : 'none'

  return `
    <g id="${node.id}" class="circle-node">
      <circle
        cx="${cx}"
        cy="${cy}"
        r="${radius}"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="2"
      />
      <text
        x="${cx}"
        y="${cy}"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="${textColor}"
        font-size="${radius * 0.3}"
        font-weight="700"
        class="circle-label"
      >
        ${node.label}
      </text>
      ${node.sublabel ? `
      <text
        x="${cx}"
        y="${cy + radius * 0.3}"
        text-anchor="middle"
        fill="${textColor}"
        font-size="${radius * 0.18}"
        class="circle-sublabel"
      >
        ${node.sublabel}
      </text>` : ''}
    </g>
  `
}

/**
 * 연결선 생성 (직선 또는 점선)
 */
function createConnection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: 'solid' | 'dashed',
  label?: string
): string {
  const strokeDasharray = type === 'dashed' ? '10,5' : 'none'

  // 화살표 마커 정의
  const arrowId = `arrow-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  return `
    <defs>
      <marker
        id="${arrowId}"
        markerWidth="10"
        markerHeight="10"
        refX="8"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" fill="#999999" />
      </marker>
    </defs>
    <line
      x1="${x1}"
      y1="${y1}"
      x2="${x2}"
      y2="${y2}"
      stroke="#999999"
      stroke-width="2"
      stroke-dasharray="${strokeDasharray}"
      marker-end="url(#${arrowId})"
      class="connection-line"
    />
    ${label ? `
    <text
      x="${(x1 + x2) / 2}"
      y="${(y1 + y2) / 2 - 10}"
      text-anchor="middle"
      fill="#666666"
      font-size="14"
      class="connection-label"
    >
      ${label}
    </text>` : ''}
  `
}

/**
 * 수평 배치 레이아웃 계산
 */
function calculateHorizontalLayout(
  nodes: CircleNode[],
  width: number,
  height: number,
  nodeRadius: number
): Array<{ node: CircleNode; x: number; y: number; radius: number }> {
  const spacing = (width - nodeRadius * 2 * nodes.length) / (nodes.length + 1)
  const centerY = height / 2

  return nodes.map((node, index) => ({
    node,
    x: spacing + nodeRadius + (nodeRadius * 2 + spacing) * index,
    y: centerY,
    radius: nodeRadius
  }))
}

/**
 * 수직 배치 레이아웃 계산
 */
function calculateVerticalLayout(
  nodes: CircleNode[],
  width: number,
  height: number,
  nodeRadius: number
): Array<{ node: CircleNode; x: number; y: number; radius: number }> {
  const spacing = (height - nodeRadius * 2 * nodes.length) / (nodes.length + 1)
  const centerX = width / 2

  return nodes.map((node, index) => ({
    node,
    x: centerX,
    y: spacing + nodeRadius + (nodeRadius * 2 + spacing) * index,
    radius: nodeRadius
  }))
}

/**
 * 그리드 배치 레이아웃 계산
 */
function calculateGridLayout(
  nodes: CircleNode[],
  width: number,
  height: number,
  nodeRadius: number
): Array<{ node: CircleNode; x: number; y: number; radius: number }> {
  const cols = Math.ceil(Math.sqrt(nodes.length))
  const rows = Math.ceil(nodes.length / cols)

  const spacingX = (width - nodeRadius * 2 * cols) / (cols + 1)
  const spacingY = (height - nodeRadius * 2 * rows) / (rows + 1)

  return nodes.map((node, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)

    return {
      node,
      x: spacingX + nodeRadius + (nodeRadius * 2 + spacingX) * col,
      y: spacingY + nodeRadius + (nodeRadius * 2 + spacingY) * row,
      radius: nodeRadius
    }
  })
}

/**
 * 원형 배치 레이아웃 계산
 */
function calculateCircularLayout(
  nodes: CircleNode[],
  width: number,
  height: number,
  nodeRadius: number
): Array<{ node: CircleNode; x: number; y: number; radius: number }> {
  const centerX = width / 2
  const centerY = height / 2
  const circleRadius = Math.min(width, height) / 2 - nodeRadius - 50

  return nodes.map((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI - Math.PI / 2

    return {
      node,
      x: centerX + circleRadius * Math.cos(angle),
      y: centerY + circleRadius * Math.sin(angle),
      radius: nodeRadius
    }
  })
}

/**
 * SVG 다이어그램 생성
 */
export function generateSVGDiagram(config: DiagramConfig): string {
  const { width, height, nodes, connections = [], layout = 'horizontal' } = config

  // 노드 크기 계산
  const baseSizeMap = { small: 60, medium: 100, large: 150 }
  const nodeRadius = nodes[0]?.size ? baseSizeMap[nodes[0].size] : 100

  // 레이아웃 계산
  let positions: Array<{ node: CircleNode; x: number; y: number; radius: number }>

  switch (layout) {
    case 'horizontal':
      positions = calculateHorizontalLayout(nodes, width, height, nodeRadius)
      break
    case 'vertical':
      positions = calculateVerticalLayout(nodes, width, height, nodeRadius)
      break
    case 'grid':
      positions = calculateGridLayout(nodes, width, height, nodeRadius)
      break
    case 'circular':
      positions = calculateCircularLayout(nodes, width, height, nodeRadius)
      break
    default:
      positions = calculateHorizontalLayout(nodes, width, height, nodeRadius)
  }

  // 연결선 생성
  const connectionsSVG = connections.map(conn => {
    const fromPos = positions.find(p => p.node.id === conn.from)
    const toPos = positions.find(p => p.node.id === conn.to)

    if (!fromPos || !toPos) return ''

    // 원의 경계에서 시작/끝나도록 좌표 조정
    const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x)
    const x1 = fromPos.x + fromPos.radius * Math.cos(angle)
    const y1 = fromPos.y + fromPos.radius * Math.sin(angle)
    const x2 = toPos.x - toPos.radius * Math.cos(angle)
    const y2 = toPos.y - toPos.radius * Math.sin(angle)

    return createConnection(x1, y1, x2, y2, conn.type, conn.label)
  }).join('\n')

  // 노드 생성
  const nodesSVG = positions.map(pos =>
    createCircleNode(pos.x, pos.y, pos.radius, pos.node)
  ).join('\n')

  return `
<svg
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  xmlns="http://www.w3.org/2000/svg"
  class="svg-diagram"
>
  ${connectionsSVG}
  ${nodesSVG}
</svg>
  `.trim()
}

/**
 * 2개 원형 비교 다이어그램 생성 (사업관리방안 스타일)
 *
 * 예: EPMS vs EGMS
 */
export function generateTwoCircleComparison(
  leftCircle: { label: string; sublabel?: string; items: string[] },
  rightCircle: { label: string; sublabel?: string; items: string[] }
): string {
  const width = 1200
  const height = 600
  const circleRadius = 180
  const leftX = width * 0.3
  const rightX = width * 0.7
  const centerY = height / 2

  // 왼쪽 원 (검은색)
  const leftCircleSVG = createCircleNode(leftX, centerY, circleRadius, {
    id: 'left-circle',
    label: leftCircle.label,
    sublabel: leftCircle.sublabel,
    color: 'black'
  })

  // 오른쪽 원 (노란색)
  const rightCircleSVG = createCircleNode(rightX, centerY, circleRadius, {
    id: 'right-circle',
    label: rightCircle.label,
    sublabel: rightCircle.sublabel,
    color: 'yellow'
  })

  // 왼쪽 항목들
  const leftItemsHTML = leftCircle.items.map(item =>
    `<li class="comparison-item">${item}</li>`
  ).join('\n')

  // 오른쪽 항목들
  const rightItemsHTML = rightCircle.items.map(item =>
    `<li class="comparison-item">${item}</li>`
  ).join('\n')

  return `
<div class="two-circle-comparison">
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${leftCircleSVG}
    ${rightCircleSVG}
  </svg>
  <div class="comparison-content">
    <div class="comparison-column left">
      <ul class="comparison-items">
        ${leftItemsHTML}
      </ul>
    </div>
    <div class="comparison-column right">
      <ul class="comparison-items">
        ${rightItemsHTML}
      </ul>
    </div>
  </div>
</div>
  `.trim()
}

/**
 * 프로세스 플로우 다이어그램 생성 (진척관리방안 스타일)
 *
 * 단계별 원형 + 점선 연결
 */
export function generateProcessFlow(
  steps: Array<{
    id: string
    label: string
    sublabel?: string
    color: 'black' | 'yellow'
    description?: string
  }>
): string {
  const width = 1200
  const height = 300
  // nodeRadius는 현재 사용되지 않음 (SVG 다이어그램에서 자동 계산)
  // const nodeRadius = 80

  const nodes: CircleNode[] = steps.map((step, index) => ({
    id: step.id,
    label: step.label,
    sublabel: step.sublabel,
    color: index === steps.length - 1 ? 'yellow' : 'black', // 마지막만 노란색
    size: 'medium'
  }))

  const connections: Connection[] = steps.slice(0, -1).map((step, index) => ({
    from: step.id,
    to: steps[index + 1].id,
    type: 'dashed'
  }))

  const diagramSVG = generateSVGDiagram({
    width,
    height,
    nodes,
    connections,
    layout: 'horizontal'
  })

  // 하단 설명 텍스트
  const descriptionsHTML = steps.map(step =>
    step.description ? `
    <div class="step-description">
      <h4>${step.label}</h4>
      <p>${step.description}</p>
    </div>` : ''
  ).join('\n')

  return `
<div class="process-flow-diagram">
  ${diagramSVG}
  ${descriptionsHTML ? `
  <div class="step-descriptions">
    ${descriptionsHTML}
  </div>` : ''}
</div>
  `.trim()
}

/**
 * 수평 타임라인 다이어그램 생성
 *
 * 화살표 + 단계 표시
 */
export function generateHorizontalTimeline(
  phases: Array<{
    title: string
    duration?: string
    items: string[]
  }>
): string {
  const width = 1200
  const height = 400
  const phaseWidth = width / phases.length

  const phaseBoxes = phases.map((phase, index) => {
    const x = index * phaseWidth
    const isLast = index === phases.length - 1
    const bgColor = isLast ? '#FFD700' : (index % 2 === 0 ? '#2d2d2d' : '#f5f5f5')
    const textColor = isLast || index % 2 === 0 ? '#FFFFFF' : '#000000'

    const itemsHTML = phase.items.map(item =>
      `<li style="color: ${textColor}; font-size: 14px;">${item}</li>`
    ).join('\n')

    return `
    <div class="timeline-phase" style="
      position: absolute;
      left: ${x}px;
      width: ${phaseWidth}px;
      height: 100%;
      background: ${bgColor};
      border-right: 2px solid #ddd;
      padding: 20px;
    ">
      <h3 style="color: ${textColor}; margin-bottom: 8px;">${phase.title}</h3>
      ${phase.duration ? `<p style="color: ${textColor}; font-size: 12px; opacity: 0.8;">${phase.duration}</p>` : ''}
      <ul style="margin-top: 12px; padding-left: 20px; list-style: disc;">
        ${itemsHTML}
      </ul>
      ${!isLast ? `
      <div style="
        position: absolute;
        right: -10px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-top: 10px solid transparent;
        border-bottom: 10px solid transparent;
        border-left: 10px solid ${bgColor};
      "></div>` : ''}
    </div>
    `
  }).join('\n')

  return `
<div class="horizontal-timeline" style="
  position: relative;
  width: ${width}px;
  height: ${height}px;
  overflow: hidden;
  border: 1px solid #ddd;
  border-radius: 8px;
">
  ${phaseBoxes}
</div>
  `.trim()
}
