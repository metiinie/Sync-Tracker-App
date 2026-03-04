import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Dimensions, Text } from 'react-native';
import Svg, { G, Circle, Line, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as d3 from 'd3-force';
import { MotiView } from 'moti';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Node extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    type: 'task' | 'owner' | 'participant' | 'assigner';
    state?: string;
    avatarUrl?: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
    source: string;
    target: string;
    type: 'auth' | 'participation';
}

interface VisionGraphProps {
    task: any;
    ownerName: string;
    assignerName: string;
    height?: number;
}

const getSyncColor = (state: string) => {
    switch (state) {
        case 'IN_SYNC': return '#10B981';
        case 'NEEDS_UPDATE': return '#F59E0B';
        case 'BLOCKED': return '#EF4444';
        case 'HELP_REQUESTED': return '#3B82F6';
        case 'PENDING': return '#8B5CF6';
        case 'COMPLETED': return '#111827';
        default: return '#6B7280';
    }
};

const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

const VisionGraph: React.FC<VisionGraphProps> = ({ task, ownerName, assignerName, height = 500 }) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const simulationRef = useRef<d3.Simulation<Node, undefined> | null>(null);

    // Create graph data
    useEffect(() => {
        const newNodes: Node[] = [
            { id: 'task', label: 'TASK', type: 'task' },
            { id: 'assigner', label: assignerName, type: 'assigner' },
            { id: 'owner', label: ownerName, type: 'owner', state: task.syncState },
        ];

        const newLinks: Link[] = [
            { source: 'assigner', target: 'task', type: 'auth' },
            { source: 'task', target: 'owner', type: 'auth' },
        ];

        if (task.participants) {
            task.participants.forEach((p: any) => {
                newNodes.push({
                    id: p.userId,
                    label: p.user?.name || 'User',
                    type: 'participant',
                    state: p.syncState || 'IN_SYNC'
                });
                newLinks.push({ source: 'owner', target: p.userId, type: 'participation' });
            });
        }

        setNodes(newNodes);
        setLinks(newLinks);
    }, [task, ownerName, assignerName, simulationRef]);

    // Initialize Simulation
    useEffect(() => {
        if (nodes.length === 0) return;

        const simulation = d3.forceSimulation<Node>(nodes)
            .force('link', d3.forceLink<Node, Link>(links).id(d => (d as Node).id).distance(d => (d as Link).type === 'auth' ? 80 : 100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('collide', d3.forceCollide().radius(d => {
                const node = d as Node;
                const size = node.type === 'task' ? 35 : node.type === 'owner' ? 30 : node.type === 'assigner' ? 20 : 25;
                return size + 10;
            }).iterations(3))
            .force('center', d3.forceCenter(SCREEN_WIDTH / 2, height / 2))
            .force('x', d3.forceX(SCREEN_WIDTH / 2).strength(0.1))
            .force('y', d3.forceY<Node>().y(d => {
                const node = d as Node;
                if (node.type === 'assigner') return height * 0.2;
                if (node.type === 'task') return height * 0.4;
                if (node.type === 'owner') return height * 0.6;
                return height * 0.8;
            }).strength(0.5))
            .on('tick', () => {
                setNodes([...nodes]);
            });

        simulationRef.current = simulation;

        return () => {
            simulation.stop();
        };
    }, [nodes.length, height, links]);

    return (
        <View style={{ height, width: SCREEN_WIDTH, backgroundColor: '#FAFAFA' }}>
            <Svg height={height} width={SCREEN_WIDTH}>
                <Defs>
                    <RadialGradient id="blockedGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
                        <Stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                    </RadialGradient>
                    <RadialGradient id="helpGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                        <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </RadialGradient>
                </Defs>

                {/* Draw Links */}
                {links.map((link, i) => {
                    const sourceNode = typeof link.source === 'string' ? nodes.find(n => n.id === link.source) : (link.source as Node);
                    const targetNode = typeof link.target === 'string' ? nodes.find(n => n.id === link.target) : (link.target as Node);

                    if (!sourceNode || !targetNode || sourceNode.x === undefined || sourceNode.y === undefined || targetNode.x === undefined || targetNode.y === undefined) return null;

                    return (
                        <Line
                            key={`link-${i}`}
                            x1={sourceNode.x}
                            y1={sourceNode.y}
                            x2={targetNode.x}
                            y2={targetNode.y}
                            stroke={link.type === 'auth' ? '#D1D5DB' : '#E5E7EB'}
                            strokeWidth={link.type === 'auth' ? 2 : 1.5}
                            strokeDasharray={link.type === 'auth' ? '0' : '5,5'}
                        />
                    );
                })}

                {/* Draw Nodes */}
                {nodes.map((node) => {
                    if (node.x === undefined || node.y === undefined) return null;
                    const isBlocked = node.state === 'BLOCKED';
                    const isHelp = node.state === 'HELP_REQUESTED';
                    const color = node.type === 'task' ? '#111827' : getSyncColor(node.state || 'IN_SYNC');
                    const size = node.type === 'task' ? 35 : node.type === 'owner' ? 30 : node.type === 'assigner' ? 20 : 25;

                    return (
                        <G key={`node-${node.id}`} x={node.x} y={node.y}>
                            {/* Glow effects for urgent states */}
                            {isBlocked && (
                                <Circle r={size * 1.5} fill="url(#blockedGlow)" />
                            )}
                            {isHelp && (
                                <Circle r={size * 1.5} fill="url(#helpGlow)" />
                            )}

                            {/* Node Body Layer */}
                            {node.type === 'owner' && (
                                <Circle r={size + 6} fill="transparent" stroke={color} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="3,3" />
                            )}

                            <Circle
                                r={size}
                                fill={node.type === 'assigner' ? '#F3F4F6' : color}
                                stroke={node.type === 'assigner' ? '#D1D5DB' : '#FFF'}
                                strokeWidth={node.type === 'task' ? 3 : 2}
                            />

                            {node.type === 'task' && (
                                <Circle r={size - 6} fill="transparent" stroke="#FFF" strokeWidth={1} strokeOpacity={0.3} />
                            )}

                            {/* Initials for owners/participants */}
                            <SvgText
                                y={5}
                                fill={node.type === 'assigner' ? '#6B7280' : '#FFF'}
                                fontSize={size * 0.4}
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                {node.type === 'task' ? 'TRACK' : getInitials(node.label)}
                            </SvgText>

                            {/* Node Label (External) */}
                            <SvgText
                                y={size + 15}
                                fill="#4B5563"
                                fontSize="10"
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                {node.label.length > 12 ? node.label.substring(0, 10) + '...' : node.label}
                            </SvgText>
                        </G>
                    );
                })}
            </Svg>
        </View>
    );
};

export default VisionGraph;
