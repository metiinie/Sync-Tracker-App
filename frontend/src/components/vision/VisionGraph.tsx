import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { G, Circle, Line, Text as SvgText, Image as SvgImage } from 'react-native-svg';
import * as d3 from 'd3-force';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Node extends d3.SimulationNodeDatum {
    id: string;
    type: 'TASK' | 'OWNER' | 'PARTICIPANT' | 'ASSIGNER';
    label: string;
    avatarUrl?: string;
    status?: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
    source: string;
    target: string;
}

interface VisionGraphProps {
    task: any;
    width?: number;
    height?: number;
}

const getSyncColor = (state: string) => {
    switch (state) {
        case 'IN_SYNC': return '#10B981';
        case 'NEEDS_UPDATE': return '#F59E0B';
        case 'BLOCKED': return '#EF4444';
        case 'HELP_REQUESTED': return '#3B82F6';
        default: return '#6B7280';
    }
};

const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const VisionGraph = ({ task, width = SCREEN_WIDTH, height = 500 }: VisionGraphProps) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<any[]>([]);

    useEffect(() => {
        if (!task) return;

        // 1. Prepare Nodes
        const graphNodes: Node[] = [
            { id: 'task', type: 'TASK', label: 'TASK', fx: width / 2, fy: 80 },
            {
                id: `owner-${task.responsibleOwner}`,
                type: 'OWNER',
                label: task.owner?.name || 'Owner',
                avatarUrl: task.owner?.avatarUrl,
                status: task.syncState,
                fx: width / 2,
                fy: 180
            }
        ];

        if (task.assigner) {
            graphNodes.push({
                id: `assigner-${task.assignerId}`,
                type: 'ASSIGNER',
                label: 'ORIGIN',
                avatarUrl: task.assigner.avatarUrl,
                fx: (width / 2) - 100,
                fy: 80
            });
        }

        task.participants?.forEach((p: any, i: number) => {
            graphNodes.push({
                id: `participant-${p.userId}`,
                type: 'PARTICIPANT',
                label: p.user?.name || 'Participant',
                avatarUrl: p.user?.avatarUrl,
                status: p.syncState || 'IN_SYNC'
            });
        });

        // 2. Prepare Links
        const graphLinks: Link[] = [
            { source: 'task', target: `owner-${task.responsibleOwner}` }
        ];

        if (task.assigner) {
            graphLinks.push({ source: `assigner-${task.assignerId}`, target: 'task' });
        }

        task.participants?.forEach((p: any) => {
            graphLinks.push({ source: `owner-${task.responsibleOwner}`, target: `participant-${p.userId}` });
        });

        // 3. Initialize Simulation
        const simulation = d3.forceSimulation<Node>(graphNodes)
            .force('link', d3.forceLink<Node, Link>(graphLinks).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-500))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(40));

        // Let simulation run for a bit to stabilize
        for (let i = 0; i < 100; ++i) simulation.tick();

        setNodes([...graphNodes]);
        setLinks([...graphLinks]);

        return () => simulation.stop();
    }, [task, width, height]);

    return (
        <View style={{ width, height, backgroundColor: '#FAFAFA' }}>
            <Svg width={width} height={height}>
                {/* Render Links */}
                {links.map((link, i) => (
                    <Line
                        key={`link-${i}`}
                        x1={link.source.x}
                        y1={link.source.y}
                        x2={link.target.x}
                        y2={link.target.y}
                        stroke="#E2E8F0"
                        strokeWidth="2"
                        strokeDasharray={link.source.type === 'TASK' ? "5,5" : "0"}
                    />
                ))}

                {/* Render Nodes */}
                {nodes.map((node, i) => {
                    const isTask = node.type === 'TASK';
                    const isOwner = node.type === 'OWNER';
                    const color = node.status ? getSyncColor(node.status) : (isTask ? '#111827' : '#9CA3AF');
                    const size = isTask ? 30 : (isOwner ? 36 : 28);

                    return (
                        <G key={`node-${node.id}`} translate={`${node.x},${node.y}`}>
                            {/* Outline/Aura for status */}
                            {node.status && (
                                <Circle
                                    r={size + 4}
                                    fill={color}
                                    opacity={0.2}
                                />
                            )}

                            {/* Main Circle */}
                            <Circle
                                r={size}
                                fill={isTask ? '#111827' : '#FFF'}
                                stroke={color}
                                strokeWidth={isOwner ? 3 : 2}
                            />

                            {/* Avatar or Initial */}
                            {isTask ? (
                                <SvgText
                                    y={5}
                                    fill="#FFF"
                                    fontSize="10"
                                    fontWeight="900"
                                    textAnchor="middle"
                                >
                                    TASK
                                </SvgText>
                            ) : (
                                <G>
                                    <View style={{ width: size * 2, height: size * 2, borderRadius: size, overflow: 'hidden', position: 'absolute', top: -size, left: -size }}>
                                        {node.avatarUrl ? (
                                            <SvgImage
                                                x={-size}
                                                y={-size}
                                                width={size * 2}
                                                height={size * 2}
                                                href={{ uri: node.avatarUrl }}
                                                clipPath={`circle(${size}px at ${size}px ${size}px)`}
                                            />
                                        ) : (
                                            <SvgText
                                                y={size * 0.15}
                                                fill={color}
                                                fontSize={size * 0.4}
                                                fontWeight="bold"
                                                textAnchor="middle"
                                            >
                                                {getInitials(node.label)}
                                            </SvgText>
                                        )}
                                    </View>
                                </G>
                            )}

                            {/* Label */}
                            <SvgText
                                y={size + 15}
                                fill="#4B5563"
                                fontSize="10"
                                fontWeight="700"
                                textAnchor="middle"
                            >
                                {isTask ? task.title.substring(0, 15) + (task.title.length > 15 ? '...' : '') : node.label.split(' ')[0]}
                            </SvgText>
                        </G>
                    );
                })}
            </Svg>
        </View>
    );
};

export default VisionGraph;
